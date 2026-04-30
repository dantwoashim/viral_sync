# Day 129 CSV Import

## Shipped

`POST /api/launch/evidence/csv-import` accepts CSV text or JSON with a `csv` field.

The importer matches rows by receipt id, manual receipt id, or receipt PDA.
