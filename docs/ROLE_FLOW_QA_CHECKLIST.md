# ROLE_FLOW_QA_CHECKLIST.md

A repeatable QA checklist to validate Principal → Teacher → Parent flows per release.

## Principal → Teacher
- [ ] Principal sends announcement → Teachers receive in-app and via WhatsApp (when enabled)
- [ ] Principal views metrics → Teacher detail → navigation valid, no dead routes
- [ ] Principal initiates meeting → follow-up action items created and visible to teachers

## Teacher → Parent
- [ ] Teacher assigns homework → Parent sees assignment and due date
- [ ] Teacher grades assignment → Parent sees grade and feedback
- [ ] Teacher messages parents → Parent receives message notification

## Cross-Cutting
- [ ] All screens work offline with last-known data; changes queue and reconcile
- [ ] All strings localized (en/af/zu baseline)
- [ ] Analytics events emitted (open/start/complete/fail) with role and org context
- [ ] Navigation uses typed helpers; no stringly-typed routes
- [ ] No mock data present; all metrics backed by Supabase queries/views
- [ ] RLS enforced on all queries
- [ ] Error/empty states present and accessible
