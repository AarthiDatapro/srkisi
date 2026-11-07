# certificate_manager — requirements (frontend)

**Pair:** `server/certificate_manager`  
Update this file in the same PR when this module changes.

## Who

Employee with admin screen `certificates` **view**. Mutations need **edit**.

## Screen

`#/admin_dashboard/certificates`

One builder. A certificate is its name, one PNG or JPG, and variable aliases placed on that picture.

## Must do

- Match the template builder: upload, variables, canvas, and properties on the same screen.
- A variable has one alias. The canvas shows it as `{Alias}`.
- Save writes the name and the placed variables. A new picture replaces the one on that certificate.
- Main padding from `design_system/shell.css` only.

## Done when

- View-only cannot change the certificate.
- Failed loads and failed saves show a toast.
