# Day 233 - Automated Invoicing

Automated invoicing converts verified-visit usage into invoice line items.

Accounting checks:

- Line item totals equal quantity times unit price.
- Invoice id is idempotent per period.
- Zero usage does not create a surprise charge.
