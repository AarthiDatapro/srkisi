# certificate_manager — requirements (backend)

**Pair:** `dataprolms/src/certificate_manager`  
**Source of truth:** `tbl_certificates`. One row is one certificate: name, picture, and variables.  
Update this file in the same PR when this module changes.

## Who

Employee with `certificates` **view**. Mutations need **edit**.

## APIs

Node serves these with an employee session and screen access:

- List, get, create, save, replace picture, delete
- Preview the placed variables on the picture

Owned paths use snake_case under `/api/certificate_manager/certificates`.

## Must do

- Keep auth on the Node server. The browser talks only to this API.
- Store the certificate name, PNG or JPG, and variable aliases in `tbl_certificates`.
- Store the picture with `upload_to_bucket` in the `certificate-templates` bucket.
- A variable is one alias. Position, font, and alignment live on that same field.
- On first use, copy any older artwork rows into `tbl_certificates`, then drop the old certificate tables.

## Done when

- Allowed staff can load and save a certificate from the builder.
- Writes require `certificates` **edit**.
- Preview returns a PNG.
