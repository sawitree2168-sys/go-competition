import unittest,runpy,collections
from pathlib import Path
module=runpy.run_path(str(Path(__file__).with_name('import-history-2026.py')))
class ImportTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=module['prepare']()
 def test_deterministic_and_unique_occurrences(self):
  self.assertEqual(self.p,module['prepare']())
  self.assertEqual(len(self.p['games']),len({g['id'] for g in self.p['games']}))
 def test_two_sides_and_winner(self):
  for g in self.p['games']:
   self.assertNotEqual(g['a'],g['b'])
   self.assertIn(g['winner'],(g['a'],g['b'],None))
   self.assertIn(g['kind'],('played','walkover','bye','not_played'))
   self.assertTrue(g['evidence']['verification'])
 def test_updates_are_not_event_dates(self):
  e={x['id']:x for x in self.p['events']}
  self.assertEqual(e['association:240769']['date'],'2026-07-18')
  self.assertIsNone(e['association:300669']['date'])
 def test_corrections_and_other_editions_not_games(self):
  for tab in ('171069','211268','030269','210269','210869'):
   self.assertFalse(any(g['event_id']=='association:'+tab for g in self.p['games']))
 def test_identity_requires_independent_name_evidence(self):
  mismatches={r['key'] for r in self.p['reviews'] if r['reason']=='identity_name_mismatch'}
  self.assertTrue(mismatches)
  self.assertTrue(all(k.startswith('local:') for k in mismatches))
  self.assertEqual(module['norm']('ด.ช. วายุภัค ชูชัยศรี 1 DAN'),module['norm']('วายุภัค ชูชัยศรี'))
  self.assertNotEqual(module['norm']('Chayapon Phanthasen'),module['norm']('ชยพล พันธเสน'))
 def test_onego_cross_source_matches_are_evidence(self):
  linked=[g for g in self.p['games'] if 'onego_row' in g['evidence']]
  self.assertGreater(len(linked),250)
  keys=[(g['event_id'],g['division'],g['round'],tuple(sorted(filter(None,(g['a'],g['b']))))) for g in self.p['games']]
  self.assertEqual(len(keys),len(set(keys)))
 def test_no_self_matches_or_fake_go_ids(self):
  known={p['go_id'] for p in module['read']('data/history-identity-links.json')}
  for g in self.p['games']:
   for pid in filter(None,(g['a'],g['b'])):
    self.assertTrue(pid in known or pid.startswith('local:'))
if __name__=='__main__':unittest.main()
