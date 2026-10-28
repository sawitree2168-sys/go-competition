"""Exercise built server and APIs inside one network namespace; no user writes."""
import json,os,subprocess,time,urllib.request,urllib.error
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3199'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
base='http://127.0.0.1:3199'
def get(path,expected=200):
 try:
  r=urllib.request.urlopen(base+path,timeout=20);status=r.status;body=r.read()
 except urllib.error.HTTPError as e:status=e.code;body=e.read()
 assert status==expected,(path,status,body[:120])
 return body
try:
 for _ in range(60):
  try:get('/');break
  except (urllib.error.URLError,ConnectionError):time.sleep(.2)
 else:raise AssertionError('Server did not start')
 for route in ['/schedule','/profile','/my-competitions','/registrations/00000000-0000-0000-0000-000000000000']:
  get(route)
 for route in ['/api/me/athletes','/api/me/registrations','/api/me/registrations/00000000-0000-0000-0000-000000000000']:
  get(route,401)
 get('/api/tournaments/invalid',400)
 events=json.loads(get('/api/tournaments'))['tournaments']
 assert events,'No published event to test'
 eid=events[0]['id'];event=json.loads(get('/api/tournaments/'+eid));assert len(event['divisions'])==8
 get('/tournaments/'+eid);get('/tournaments/'+eid+'/register')
 for d in event['divisions']:
  path=f"/api/tournaments/{eid}/divisions/{d['id']}"
  data=json.loads(get(path));assert data['division']['id']==d['id'];assert data['roster_available'] is True
  get(f"/tournaments/{eid}/divisions/{d['id']}")
 pay=json.loads(get('/api/tournaments/'+eid+'/payment'))
 assert pay['payment']['registration_enabled'] is False
 assert pay['payment']['qr_url'] is None
 print('PASS: page routes, 8 live divisions, public roster, invalid IDs, private API 401, payment remains closed')
finally:
 p.terminate()
 try:p.wait(timeout=5)
 except subprocess.TimeoutExpired:p.kill()
