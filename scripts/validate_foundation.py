"""Valida el plan y estructura de contratos; no ejecuta la aplicación."""
import json,re
from datetime import date,datetime,timedelta
from pathlib import Path
from uuid import UUID
ROOT=Path(__file__).resolve().parents[1]
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def check(condition,message):
 if not condition:raise ValueError(message)
def main():
 p=read('docs/project-plan.json');a=p['availability'];b=p['budget'];weeks=p['weeks'];phases=p['phases'];start=date.fromisoformat(p['start'])
 check(p['project_name']=='Köra','Nombre inesperado')
 check((date.fromisoformat(p['end'])-start).days+1==7*p['duration_weeks'],'Duración incorrecta')
 check(start.weekday()==0 and len(weeks)==p['duration_weeks'],'Semanas incorrectas')
 check(p['academic_deadline_confirmed'] is False,'No asumir plazo académico confirmado')
 for i,w in enumerate(weeks):
  check(w['week']==i+1 and date.fromisoformat(w['start'])==start+timedelta(weeks=i),'Semana desordenada')
 check(sum(x['mobile_hours'] for x in weeks)==a['mobile_gross_hours'],'Horas móviles incorrectas')
 check(sum(x['web_hours'] for x in weeks)==a['web_gross_hours'],'Horas web incorrectas')
 check(sum(x['mobile_gross_hours'] for x in phases)==a['mobile_gross_hours'],'Capacidad de fases incorrecta')
 check(sum(x['mobile_planned_hours'] for x in phases)+a['mobile_buffer_hours']==a['mobile_gross_hours'],'Reserva incorrecta')
 covered=[]
 for x in phases:
  covered.extend(range(x['week_from'],x['week_to']+1));check(x['start']==weeks[x['week_from']-1]['start'] and x['end']==weeks[x['week_to']-1]['end'],'Fechas de fase incorrectas')
 check(covered==list(range(1,len(weeks)+1)),'Fases superpuestas o incompletas')
 check(all(x['quantity']*x['unit_cop']==x['total_cop'] for x in b['cash_items']),'Rubro incorrecto')
 check(sum(x['total_cop'] for x in b['cash_items'])==b['cash_base_cop'],'Subtotal incorrecto')
 check(b['cash_total_cop']==b['cash_base_cop']+b['cash_contingency_cop'],'Total operativo incorrecto')
 check(b['mobile_labor_hours']*b['labor_hour_valuation_cop']==b['mobile_labor_valuation_cop'],'Valor laboral incorrecto')
 check(b['combined_base_cop']==b['mobile_labor_valuation_cop']+b['cash_base_cop'],'Base combinada incorrecta')
 check(b['combined_total_cop']==b['combined_base_cop']+b['combined_contingency_cop'],'Total combinado incorrecto')
 api=read('contracts/openapi.json');ids=[]
 def walk(node):
  if isinstance(node,dict):
   if '$ref' in node:
    target=api;check(node['$ref'].startswith('#/'),'Referencia externa no prevista')
    for part in node['$ref'][2:].split('/'):target=target[part]
   for v in node.values():walk(v)
  elif isinstance(node,list):
   for v in node:walk(v)
 walk(api)
 for path,item in api['paths'].items():
  for method,operation in item.items():
   if method not in ['get','post','put','patch','delete']:continue
   ids.append(operation['operationId']);params=item.get('parameters',[])+operation.get('parameters',[])
   expected=set(re.findall(r'\{([^}]+)\}',path));actual={x['name'] for x in params if x.get('in')=='path' and x.get('required')}
   check(expected==actual,'Parámetros de ruta incompletos '+path)
   check(any(s.startswith('2') for s in operation['responses']),'Sin respuesta exitosa')
   if path.startswith(('/trips','/alerts','/verifications')):check(operation.get('security',api['security'])!=[],'Ruta sensible abierta')
 check(len(ids)==len(set(ids)),'operationId duplicados')
 event=read('contracts/examples/trip-event.json');schema=read('contracts/events.schema.json')
 check(set(schema['required']).issubset(event) and set(event).issubset(schema['properties']),'Campos de evento incorrectos')
 for key in ['event_id','trip_id','entity_id']:UUID(event[key])
 datetime.fromisoformat(event['occurred_at'].replace('Z','+00:00'))
 check(event['type'] in schema['properties']['type']['enum'] and event['sequence']>=1 and event['entity_version']>=1,'Evento inválido')
 for f in [ROOT/'README.md',*(ROOT/'docs').glob('*.md')]:
  for target in re.findall(r'\]\(([^)]+)\)',f.read_text(encoding='utf-8')):
   if '://' in target or target.startswith('#'):continue
   check((f.parent/target.split('#')[0]).exists(),f'Enlace roto en {f.name}: {target}')
 print(f'OK: {len(weeks)} semanas, {len(phases)} fases, {len(ids)} operaciones y ejemplo de evento.')
 print(f'Capacidad móvil {a["mobile_gross_hours"]} h; planificadas {a["mobile_planned_hours"]} h; reserva {a["mobile_buffer_hours"]} h.')
 print(f'Operación {b["cash_total_cop"]:,} COP; con mano de obra valorada {b["combined_total_cop"]:,} COP.')
 print('No valida todo el estándar OpenAPI ni el funcionamiento de las aplicaciones.')
if __name__=='__main__':main()
