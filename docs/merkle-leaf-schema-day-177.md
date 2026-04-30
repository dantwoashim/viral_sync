# Day 177 - Merkle Leaf Schema

Compressed receipt leaf fields:

- `receiptHash`
- `merchantHash`
- `campaignHash`
- `amountBucket`
- `settledAtDay`
- `evidenceLevel`

Proof fields:

- `leaf`
- `leafIndex`
- `root`
- `siblings`
- `treeId`
- `canopyDepth`

No customer name, phone, wallet, raw device id, or raw receipt image is included.
