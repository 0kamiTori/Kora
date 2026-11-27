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
 p=read('Documentación/project-plan.json');a=p['availability'];b=p['budget'];weeks=p['weeks'];phases=p['phases'];start=date.fromisoformat(p['start'])
 check(p['project_name']=='Köra','Nombre inesperado')
 days=(date.fromisoformat(p['end'])-start).days+1
 check(isinstance(p['academic_deadline_confirmed'],bool),'Estado académico debe ser booleano')
 if p['academic_deadline_confirmed']:check(bool(p.get('academic_deadline_evidence')),'Falta evidencia del día académico confirmado')
 check(p.get('planning_mode')=='full_system_partial_weeks','Modo de planificación no soportado')
 check(days==p['duration_days'],'Duración de ventana incorrecta')
 check(len(weeks)==p['duration_weeks'],'Cantidad de ventanas semanales incorrecta')
 next_day=start
 for i,w in enumerate(weeks):
  check(w['week']==i+1 and date.fromisoformat(w['start'])==next_day,'Ventana semanal desordenada')
  check(date.fromisoformat(w['end'])>=next_day,'Fin semanal anterior al inicio')
  next_day=date.fromisoformat(w['end'])+timedelta(days=1)
 check(next_day==date.fromisoformat(p['end'])+timedelta(days=1),'Ventanas incompletas')
 check(sum(x['mobile_hours'] for x in weeks)==a['mobile_gross_hours'],'Horas móviles incorrectas')
 check(sum(x['web_hours'] for x in weeks)==a['web_gross_hours'],'Horas web incorrectas')
 check(sum(x['mobile_planned_hours'] for x in phases)==a['mobile_planned_hours'],'Horas previstas móviles incorrectas')
 check(sum(x['mobile_planned_hours'] for x in phases)+a['mobile_buffer_hours']==a['mobile_gross_hours'],'Reserva incorrecta')
 next_day=start
 for x in phases:
  check(date.fromisoformat(x['start'])==next_day,'Fases superpuestas o con huecos')
  check(date.fromisoformat(x['end'])>=next_day,'Fin de fase incorrecto')
  next_day=date.fromisoformat(x['end'])+timedelta(days=1)
 check(next_day==date.fromisoformat(p['end'])+timedelta(days=1),'Fases no cubren la ventana')
 check(sum(x['web_planned_hours'] for x in phases)+a['web_buffer_hours']==a['web_gross_hours'],'Capacidad web incorrecta')
 check(sum(x['web_planned_hours'] for x in phases)==a['web_planned_hours'],'Horas previstas web incorrectas')
 check(all(0<=w[k]<=a['weekly_hours_per_person'] for w in weeks for k in ['mobile_hours','web_hours']),'Capacidad semanal fuera de límites')
 check(all(x[k]>=0 for x in phases for k in ['mobile_planned_hours','web_planned_hours']),'Horas de fase negativas')
 check(all(x['status'] in ['not_started','in_progress','complete'] for x in phases),'Estado de fase inválido')
 for x in phases:
  if x['status']=='complete':check(bool(x.get('evidence')),'Fase cerrada sin evidencia')
 check(sum(x['total_cop'] for x in b['items'])==b['computed_item_sum_cop'],'Suma de rubros incorrecta')
 check(b['computed_item_sum_cop']-b['declared_subtotal_cop']==b['reconciliation_pending_cop'],'Diferencia presupuestaria no registrada')
 check(b['declared_total_cop']==b['declared_subtotal_cop']+b['declared_contingency_cop'],'Total declarado inconsistente')
 check((ROOT/p['historical_plan']).exists(),'Falta plan histórico')
 check(not (ROOT/'docs').exists() and not (ROOT/'Documentacion').exists() and not (ROOT/'contracts').exists(),'Documentación fuera de carpeta canónica')
 for filename in ['VISION.md','PLAN_MOVIL.md','TRAZABILIDAD.md','ESTADO.md','DECISIONES.md','PENDIENTES.md','PRESUPUESTO.md','GUIA_CODEX.md','01_Documento_vision.docx','02_Plan_desarrollo_y_guia.docx','03_Registro_control_cambios.docx']:
  check((ROOT/'Documentación'/filename).is_file(),'Falta documento '+filename)
 vision=(ROOT/'Documentación/VISION.md').read_text(encoding='utf-8')
 trace=(ROOT/'Documentación/TRAZABILIDAD.md').read_text(encoding='utf-8')
 for prefix,count in [('RF',13),('RNF',8)]:
  for i in range(1,count+1):
   key=f'{prefix}{i:02d}'
   check(key in vision and key in trace,'Falta trazabilidad '+key)
 api=read('Documentación/Contratos/openapi.json');ids=[]
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
 event=read('Documentación/Contratos/examples/trip-event.json');schema=read('Documentación/Contratos/events.schema.json')
 check(set(schema['required']).issubset(event) and set(event).issubset(schema['properties']),'Campos de evento incorrectos')
 for key in ['event_id','trip_id','entity_id']:UUID(event[key])
 datetime.fromisoformat(event['occurred_at'].replace('Z','+00:00'))
 check(event['type'] in schema['properties']['type']['enum'] and event['sequence']>=1 and event['entity_version']>=1,'Evento inválido')
 # Historical snapshots are preserved verbatim and are not current navigation.
 current_md=[f for f in ROOT.rglob('*.md') if not any(x in f.parts for x in ['.git','.qa','Historial'])]
 for f in current_md:
  for target in re.findall(r'\]\(([^)]+)\)',f.read_text(encoding='utf-8')):
   if '://' in target or target.startswith('#'):continue
   check((f.parent/target.split('#')[0]).exists(),f'Enlace roto en {f.name}: {target}')
 print(f'OK: {days} días, {len(weeks)} ventanas semanales, {len(phases)} fases propuestas, {len(ids)} operaciones del diseño v1 y ejemplo de evento.')
 print(f'Capacidad móvil {a["mobile_gross_hours"]} h; planificadas {a["mobile_planned_hours"]} h; reserva {a["mobile_buffer_hours"]} h.')
 print(f'Presupuesto fuente: {b["declared_total_cop"]:,} COP; diferencia pendiente: {b["reconciliation_pending_cop"]:,} COP.')
 print('No valida todo el estándar OpenAPI ni el funcionamiento de las aplicaciones.')
if __name__=='__main__':main()
