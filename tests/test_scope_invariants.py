"""Unit tests verifying SCOPE-01 business invariants, product scope and decision records."""
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import context_memory as cm


class ScopeInvariantsTest(unittest.TestCase):
    def setUp(self):
        self.spec_file = ROOT / 'docs/plans/MVP_SCOPE_AND_INVARIANTS.md'
        self.decision_file = ROOT / 'docs/memory/DEC-5b03fed1b2fed4f5-mvp-scope-and-stack.md'
        self.assertTrue(self.spec_file.is_file(), 'MVP_SCOPE_AND_INVARIANTS.md must exist')
        self.assertTrue(self.decision_file.is_file(), 'Decision record must exist')
        self.spec_text = self.spec_file.read_text(encoding='utf-8')

    def test_decision_record_is_valid_and_resolves_prerequisite_items(self):
        """Decision record must parse cleanly and resolve BLK-3c3a68c6caa2ce27 and HND-1edd4ae3ec404bfe."""
        view = cm.load_proposed(ROOT)
        self.assertEqual(view.errors, [], f"Proposed view has lint errors: {view.errors}")
        self.assertEqual(view.conflicts, {}, f"Proposed view has conflicts: {view.conflicts}")

        record = view.records.get('DEC-5b03fed1b2fed4f5')
        self.assertIsNotNone(record, "DEC-5b03fed1b2fed4f5 not found in proposed records")
        self.assertEqual(record.meta.get('topic'), 'mvp-scope-and-stack')
        self.assertIn('BLK-3c3a68c6caa2ce27', record.meta.get('resolves', []))
        self.assertIn('HND-1edd4ae3ec404bfe', record.meta.get('resolves', []))
        self.assertEqual(view.statuses.get('BLK-3c3a68c6caa2ce27'), 'closed')
        self.assertEqual(view.statuses.get('HND-1edd4ae3ec404bfe'), 'closed')
        self.assertEqual(view.statuses.get('DEC-5b03fed1b2fed4f5'), 'active')

    def test_single_currency_invariant(self):
        """Pricing invariant must be Sudanese Pound (SDG)."""
        self.assertIn('Sudanese Pound', self.spec_text)
        self.assertIn('`SDG`', self.spec_text)

    def test_pilot_regions_invariant(self):
        """Pilot launch regions must include Port Sudan, Khartoum, and Omdurman."""
        for city in ['Port Sudan', 'Khartoum', 'Omdurman']:
            self.assertIn(city, self.spec_text)

    def test_inventory_distinction_new_vs_used(self):
        """New vs Used inventory invariants must be clearly differentiated."""
        self.assertIn('quantity >= 1', self.spec_text)
        self.assertIn('quantity = 1', self.spec_text)
        self.assertIn('is_sealed', self.spec_text)
        self.assertIn('battery_health', self.spec_text)
        for grade in ['like_new', 'excellent', 'good', 'fair']:
            self.assertIn(grade, self.spec_text)

    def test_trust_and_verification_invariants(self):
        """Trust policy must require ID, Commercial Register/Signboard, and private R2 storage."""
        self.assertIn('National ID', self.spec_text)
        self.assertIn('Commercial Registration', self.spec_text)
        self.assertIn('Signboard', self.spec_text)
        self.assertIn('private Cloudflare R2', self.spec_text)
        for status in ['draft', 'pending_verification', 'changes_requested', 'verified', 'suspended', 'rejected']:
            self.assertIn(status, self.spec_text)

    def test_publication_trigger_invariants(self):
        """Publication trigger requires verified store and automated media processing validation."""
        self.assertIn('Gate 1 — Store Eligibility', self.spec_text)
        self.assertIn('Gate 2 — Automated Pipeline Validation', self.spec_text)
        self.assertIn('A-05', self.spec_text)

    def test_ten_field_api_contract_format(self):
        """Ten-field API contract format must be agreed and documented."""
        ten_fields = [
            'Endpoint & HTTP Method',
            'Input Parameters',
            'Request Body Schema',
            'Response Schema',
            'Authentication Requirements',
            'Authorization Scope',
            'Error Responses',
            'Pagination & Filtering',
            'Side Effects & Business-State Changes',
            'Acceptance Test Scenarios',
        ]
        for field in ten_fields:
            self.assertIn(field, self.spec_text)

    def test_customer_contact_and_guest_privacy(self):
        """Guest browsing must require no login, with peer-to-peer WhatsApp contact."""
        self.assertIn('no login', self.spec_text)
        self.assertIn('wa.me', self.spec_text)
        self.assertIn('Privacy Guarantee', self.spec_text)

    def test_first_vertical_slice_agreed(self):
        """First approved-store vertical slice must span merchant onboarding to customer contact."""
        self.assertIn('First Approved-Store Vertical Slice', self.spec_text)
        self.assertIn('M-01', self.spec_text)
        self.assertIn('A-04', self.spec_text)
        self.assertIn('C-03', self.spec_text)
        self.assertIn('GATE-01', self.spec_text)


if __name__ == '__main__':
    unittest.main()
