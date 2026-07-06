"use strict";

/**
 * Réconciliation des paiements pending.
 *
 * Problème : si le webhook d'un provider n'arrive jamais (timeout réseau,
 * mauvais callback URL, incident provider), la transaction reste en statut
 * "pending" indéfiniment. L'annonceur a payé mais son annonce n'est jamais
 * publiée — le cas le plus critique en production.
 *
 * Solution : toutes les heures, on interroge chaque provider pour les
 * transactions pending depuis plus de 24h, et on met à jour le statut si
 * le provider confirme que le paiement est terminé (COMPLETED ou FAILED).
 *
 * Providers supportés (implémentent checkStatus) :
 *   - PawaPay  : GET /v2/deposits/{depositId}
 *   - FedaPay  : GET /v1/transactions/{id}
 *
 * Providers sans checkStatus (pas d'API de consultation) :
 *   - CinetPay, OrangeMoney, MoovMoney, Wave — aucune action (skip)
 */

const cron       = require("node-cron");
const { query }  = require("../config/db");
const registry   = require("./PaymentProviderRegistry");
const Transaction = require("../models/Transaction");
const { handleSucceededPayment } = require("./paymentActions");
const logger     = require("../utils/logger");

// Seuil au-delà duquel on considère qu'un webhook ne viendra plus jamais.
// 24h est conservateur : PawaPay expire les dépôts en moins de 3h en pratique.
const STALE_HOURS = 24;

// Sécurité : pas plus de 100 transactions réconciliées par run pour éviter
// un flood d'appels API en cas de bug ou d'accumulation passée.
const BATCH_LIMIT = 100;

async function runReconciliation() {
  const { rows: staleTxs } = await query(
    `SELECT id, reference, external_id, provider, purpose, amount, currency,
            status, property_id, buyer_id, customer_email
     FROM transactions
     WHERE status = 'pending'
       AND external_id IS NOT NULL
       AND created_at < NOW() - INTERVAL '${STALE_HOURS} hours'
     ORDER BY created_at ASC
     LIMIT ${BATCH_LIMIT}`
  );

  if (staleTxs.length === 0) {
    logger.info("reconciliation: aucune transaction pending à réconcilier");
    return;
  }

  logger.info({ count: staleTxs.length }, "reconciliation: transactions à vérifier");

  let resolved = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const row of staleTxs) {
    try {
      // Vérifier que le provider existe et supporte checkStatus
      let provider;
      try {
        provider = registry.get(row.provider);
      } catch (_) {
        skipped++;
        continue; // provider inconnu (ex. ancien provider supprimé)
      }

      if (typeof provider.checkStatus !== "function") {
        skipped++;
        continue; // ce provider n'offre pas d'API de consultation
      }

      const newStatus = await provider.checkStatus(row.external_id);
      if (!newStatus) {
        // Toujours en attente ou erreur réseau passagère — on ne touche à rien
        continue;
      }

      // Statut final confirmé par le provider
      const updated = await Transaction.updateStatus(row.id, newStatus);
      await Transaction.logEvent(row.id, "reconciled", {
        from: "pending",
        to: newStatus,
        provider: row.provider,
        external_id: row.external_id,
      });

      logger.info(
        { transaction_id: row.id, reference: row.reference, provider: row.provider, newStatus },
        "reconciliation: transaction mise à jour"
      );

      if (newStatus === "succeeded") {
        await handleSucceededPayment(updated);
      }

      resolved++;
    } catch (e) {
      errors++;
      logger.error(
        { err: e.message, transaction_id: row.id, provider: row.provider },
        "reconciliation: erreur sur une transaction"
      );
    }
  }

  logger.info(
    { resolved, skipped, errors, total: staleTxs.length },
    "reconciliation: run terminé"
  );
}

function startReconciliationCron() {
  // Toutes les heures, à H:05 (décalé de 5 min pour ne pas chevaucher
  // l'alerte d'expiration qui tourne à 08:00 pile).
  cron.schedule("5 * * * *", async () => {
    try {
      await runReconciliation();
    } catch (e) {
      logger.error({ err: e.message }, "reconciliation cron: échec global");
    }
  });
  logger.info("Reconciliation cron scheduled (hourly at :05)");
}

module.exports = { startReconciliationCron, runReconciliation };
