// SPDX-License-Identifier: Apache-2.0

/**
 * Normalize transaction to support both pacs.002 and pacs.008 formats
 *
 * Many legacy rules expect FIToFIPmtSts (pacs.002) but new transactions
 * use FIToFICstmrCdtTrf (pacs.008). This helper ensures both properties exist.
 */
export function normalizeTransaction(transaction: any): any {
  // If transaction already has both formats, return as-is
  if (transaction.FIToFIPmtSts && transaction.FIToFICstmrCdtTrf) {
    return transaction;
  }

  // If it's a pacs.008 transaction (has FIToFICstmrCdtTrf but not FIToFIPmtSts)
  if (transaction.FIToFICstmrCdtTrf && !transaction.FIToFIPmtSts) {
    return {
      ...transaction,
      // Add FIToFIPmtSts structure for pacs.002 compatibility
      // Fields that don't exist in pacs.008 are set to null or empty objects with proper nesting
      FIToFIPmtSts: {
        GrpHdr: transaction.FIToFICstmrCdtTrf.GrpHdr,
        // pacs.002 specific fields - create nested objects to prevent null access errors
        // Rules may try to access nested properties like TxInfAndSts.TxSts
        OrgnlGrpInfAndSts: {
          OrgnlMsgId: null,
          OrgnlMsgNmId: null,
          GrpSts: null
        },
        TxInfAndSts: {
          StsId: null,
          OrgnlInstrId: null,
          OrgnlEndToEndId: null,
          OrgnlTxId: null,
          TxSts: null,  // Transaction Status code (e.g., ACCC, RJCT, PDNG)
          StsRsnInf: null,
          ChrgsInf: null,
          AccptncDtTm: null,
          AcctSvcrRef: null,
          ClrSysRef: null,
          OrgnlTxRef: {
            IntrBkSttlmAmt: null,
            Amt: null,
            IntrBkSttlmDt: null,
            ReqdColltnDt: null,
            ReqdExctnDt: null,
            CdtrSchmeId: null,
            SttlmInf: null,
            PmtTpInf: null,
            PmtMtd: null,
            MndtRltdInf: null,
            RmtInf: null,
            UltmtDbtr: null,
            Dbtr: null,
            DbtrAcct: null,
            DbtrAgt: null,
            DbtrAgtAcct: null,
            CdtrAgt: null,
            CdtrAgtAcct: null,
            Cdtr: null,
            CdtrAcct: null,
            UltmtCdtr: null,
            Purp: null
          }
        }
      },
    };
  }

  // If it's a pacs.002 transaction (has FIToFIPmtSts but not FIToFICstmrCdtTrf)
  if (transaction.FIToFIPmtSts && !transaction.FIToFICstmrCdtTrf) {
    return {
      ...transaction,
      // Add FIToFICstmrCdtTrf as an alias
      FIToFICstmrCdtTrf: {
        GrpHdr: transaction.FIToFIPmtSts.GrpHdr,
      },
    };
  }

  // If neither exists, return as-is (will likely cause an error downstream)
  return transaction;
}
