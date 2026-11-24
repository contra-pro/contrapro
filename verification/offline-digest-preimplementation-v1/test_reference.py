"""Isolated reference harness tests, never application tests or a production API."""
import json
from pathlib import Path
import subprocess
import unittest

HERE = Path(__file__).resolve().parent


class ReferenceConformance(unittest.TestCase):
    def test_independent_reference_paths_and_primitive_checks(self):
        for command in (["node", "reference-node.mjs"], ["python", "reference-python.py"]):
            result = subprocess.run(command, cwd=HERE, capture_output=True, text=True, timeout=120)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        candidate = json.loads((HERE / "known-answers.json").read_text(encoding="utf-8"))
        independent = json.loads((HERE / "independent-python-report.json").read_text(encoding="utf-8"))
        dotnet = json.loads((HERE / "dotnet-report.json").read_text(encoding="utf-8-sig"))
        self.assertGreater(len(candidate["vectors"]), 100)
        self.assertEqual(independent["discrepancies"], [])
        self.assertEqual(independent["comparedVectors"], len(candidate["vectors"]))
        self.assertEqual(dotnet["status"], "UNVERIFIED-TOOL-POLICY")
        self.assertEqual(set(candidate["sourceRows"]), set(independent["sourceRows"]))
        self.assertEqual(len(candidate["sourceRows"]), 49)
        self.assertFalse(candidate["ownerApproved"])

    def test_exact_value_metamorphisms(self):
        answers = {v['id']: v for v in json.loads((HERE / 'known-answers.json').read_text(encoding='utf-8'))['vectors']}
        canonical = lambda id: answers[id]['records'][0]['canonicalHex']
        self.assertEqual(canonical('keys-ba'), canonical('keys-ab'))
        self.assertEqual(canonical('number-1'), canonical('number-1.0'))
        self.assertEqual(canonical('number-1'), canonical('number-1e0'))
        for a, b in [('french-precomposed', 'french-decomposed'), ('arabic-composed', 'arabic-decomposed'),
                     ('arabic-marks-a', 'arabic-marks-b'), ('number-0', 'number--0'), ('array-ab', 'array-ba'),
                     ('bigint-1', 'number-1'), ('number-1', 'string-one'), ('timestamp-0', 'timestamp-1')]:
            self.assertNotEqual(canonical(a), canonical(b))
        self.assertEqual(answers['bytes-pdf-abc']['rawSha256'], 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
        self.assertNotEqual(answers['bytes-pdf-abc']['digest']['value'], answers['bytes-pdf-abc']['rawSha256'])

    def test_frozen_revision_and_live_cas_are_distinct(self):
        answers = {v['id']: v for v in json.loads((HERE / 'known-answers.json').read_text(encoding='utf-8'))['vectors']}
        root = lambda id: answers[id]['records'][-1]['digest']
        self.assertEqual(root('v3-classic'), root('new-live-cas'))
        self.assertNotEqual(root('v3-classic'), root('new-edition'))
        self.assertEqual(answers['v3-classic']['records'][0]['digest'], answers['new-edition']['records'][0]['digest'])
        for id in ('foreign-context', 'foreign-contract', 'stale-edition', 'asset-context-mismatch', 'render-template-mismatch', 'party-context-mismatch'):
            self.assertEqual(answers[id]['result']['status'], 'binding-mismatch')
        for answer in answers.values():
            self.assertEqual(answer['result']['trust'], 'unverified')
            self.assertIs(answer['result']['canActivateSigned'], False)

    def test_budget_boundary_models_are_labeled(self):
        answers = json.loads((HERE / 'known-answers.json').read_text(encoding='utf-8'))['vectors']
        probes = [v for v in answers if v['id'].startswith('budget-')]
        self.assertEqual(len(probes), 39)
        for probe in probes:
            self.assertEqual(probe['evidenceClass'], 'counter-model-only')
            self.assertEqual(probe['result']['status'], 'invalid-input' if probe['measured'] > probe['maximum'] else 'integrity-match-unverified')
            self.assertNotIn('framedHex', probe)

    def test_second_path_detects_a_corrupted_expected_byte(self):
        target = HERE / 'known-answers.json'
        original = target.read_bytes()
        try:
            data = json.loads(original)
            row = next(v for v in data['vectors'] if v.get('records'))
            row['records'][0]['canonicalHex'] = '00'
            target.write_text(json.dumps(data, ensure_ascii=True), encoding='utf-8')
            check = subprocess.run(['python', 'reference-python.py'], cwd=HERE, capture_output=True, timeout=120)
            self.assertNotEqual(check.returncode, 0)
        finally:
            target.write_bytes(original)
            clean = subprocess.run(['python', 'reference-python.py'], cwd=HERE, capture_output=True, timeout=120)
            self.assertEqual(clean.returncode, 0, clean.stdout + clean.stderr)


if __name__ == "__main__":
    unittest.main()
