```markdown
# Official Business Configuration (Source of Truth)

Location: `server/config/business.config.json`  
Types: `types/business.ts`

This file contains the immutable (but admin-editable) business defaults:

- Gym identity (name, slogan, currency)
- Opening hours (must be enforced by booking service)
- Subscription plans (canonical list used by billing and UI)
- Dress code (display-only)
- Location & contact (editable in admin settings)
- Branding (central theme and primary colors)
- System rules (validity calculation, maxReports semantics)

Guidelines:

- All business logic must reference `server/config/business.config.json` or
  the loaded configuration object — do not hardcode plan values in code.
- `priceSingle` / `priceCouple` are integers (XOF units). `priceCouple` may be `null`.
- Booking service MUST reject attempts outside the configured opening hours.
- Admin changes to this configuration must be audited and validated.

Admin-editable fields are flagged in the `adminEditable` section; other
fields should be changed only by a migration or approved configuration update.

``` 
