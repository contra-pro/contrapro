"""Only new isolated verification tests. Earlier files must remain byte-identical."""
import json
from pathlib import Path
import subprocess
import unittest

HERE = Path(__file__).resolve().parent


class FinalGapVerification(unittest.TestCase):
    def test_new_and_read_only_baseline_comparisons(self):
        for command in (['node', 'replay-node.mjs'], ['python', '-B', 'replay-python.py']):
            output = subprocess.run(command, cwd=HERE, capture_output=True, text=True, timeout=120)
            self.assertEqual(output.returncode, 0, output.stdout + output.stderr)
        report = json.loads((HERE / 'independent-python-report.json').read_text(encoding='utf-8'))
        self.assertEqual(report['discrepancies'], [])

    def test_old_vectors_are_replayed_without_changing_them(self):
        baseline = json.loads((HERE.parent / 'offline-digest-preimplementation-v1' / 'known-answers.json').read_text(encoding='utf-8'))
        answers = json.loads((HERE / 'known-answers.json').read_text(encoding='utf-8'))
        self.assertEqual(answers['vectors'][:153], baseline['vectors'])
        self.assertEqual(answers['primitiveKnownAnswers'], baseline['primitiveKnownAnswers'])

    def test_native_accessors_and_open_prototype_decision(self):
        report = json.loads((HERE / 'native-report.json').read_text(encoding='utf-8'))
        self.assertEqual(report['getterCalls'] + report['setterCalls'], 0)
        for row in report['rows']:
            self.assertEqual(row['expected'], row['pathA']); self.assertEqual(row['pathA'], row['pathB'])
            self.assertFalse(row['canActivateSigned'])
        null = next(r for r in report['rows'] if r['id'] == 'null-prototype')
        self.assertIn('OPEN', null['policyStatus'])

    def test_combined_faults_stop_before_hashing(self):
        answers = {v['id']: v for v in json.loads((HERE / 'known-answers.json').read_text(encoding='utf-8'))['vectors']}
        for name in ['unsupported-and-malformed', 'malformed-and-missing', 'cycle-and-missing', 'missing-and-binding', 'binding-and-digest', 'all-faults']:
            self.assertEqual(answers['precedence-' + name]['hashCalls'], 0)
        self.assertEqual(answers['precedence-two-digest-mismatches']['digestMismatchIds'], ['synthetic-a', 'synthetic-b'])
        for v in answers.values():
            self.assertEqual(v['result']['trust'], 'unverified'); self.assertIs(v['result']['canActivateSigned'], False)

    def test_png_screen_is_not_a_crc_or_pixel_decoder(self):
        answers = {v['id']: v for v in json.loads((HERE / 'known-answers.json').read_text(encoding='utf-8'))['vectors']}
        for name in ['minimal-1x1', 'bounded-2x2', 'crc-not-screened', 'bad-idat-content-screen-not-decoder']:
            self.assertEqual(answers['png-' + name]['result']['status'], 'integrity-match-unverified')
        for name in ['actl', 'invalid-base64', 'trailing-byte', 'malformed-chunk-length', 'decoded-204801']:
            self.assertEqual(answers['png-' + name]['result']['status'], 'invalid-input')

    def test_synthetic_lineage_has_no_authority_claim(self):
        answers = {v['id']: v for v in json.loads((HERE / 'known-answers.json').read_text(encoding='utf-8'))['vectors']}
        self.assertEqual(answers['lineage-valid-prior']['frozenCurrentDigest'], answers['lineage-changed-live-cas']['frozenCurrentDigest'])
        self.assertEqual(answers['lineage-valid-prior']['historicalAuthority'], 'not-established')
        for name in ['self-reference', 'missing-prior', 'cross-agency-prior', 'duplicate-edition', 'cyclic-lineage']:
            self.assertEqual(answers['lineage-' + name]['hashCalls'], 0)

    def test_actual_resource_probes_have_no_partial_success(self):
        report = json.loads((HERE / 'resource-report.json').read_text(encoding='utf-8'))
        self.assertEqual(report['unverified'], 0)
        self.assertEqual(len(report['rows']), 42)
        for row in report['rows']:
            self.assertLess(row['wallMs'], 15000)
            self.assertGreater(row['peakResidentBytes'], 0)
            if row['offset'] == 1:
                self.assertEqual(row['actual']['status'], 'invalid-input'); self.assertEqual(row['actual']['hashCalls'], 0)
                self.assertIs(row['actual']['partialSuccess'], False)


if __name__ == '__main__':
    unittest.main()
