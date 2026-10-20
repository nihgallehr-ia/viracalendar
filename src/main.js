import './style.css';
import { createClient } from '@supabase/supabase-js';
import { monthDays, shiftMonth, monthRange, localISO, countByDate, statusCounts, cleanFilename, humanBytes } from './calendar.js';

const root = document.getElementById('app');
const BUCKET = 'viracalendar-videos';
const TABLE = 'viracalendar_videos';
const MAX_FILE = 50 * 1024 * 1024;
const today = () => localISO(new Date());
const isoDay = s => (s || today()).slice(0,10);
const escapeHtml = str => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attrs = value => escapeHtml(value);
const monthName = (y,m) => new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(y,m,1));
const humanDate = date => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
const state = {
  config: null, client: null, user: null, month: new Date().getMonth(),
  year: new Date().getFullYear(), selected: today(), rows: [],
  loading: false, busy: false, notice: '', error: false, modal: '',
  draft: [], edit: null, preview: null, authMode: 'login', uploadLabel: ''
};

function notice(message,isError=false){state.notice=message;state.error=isError;render();}
async function boot(){
  let config=null;
  try{
    const r=await fetch(import.meta.env.BASE_URL+'cloud-config.json',{cache:'no-store'});
    const j=await r.json();
    if(j.supabaseUrl && j.supabasePublishableKey)config=j;
  }catch{}
  try{const local=JSON.parse(localStorage.getItem('viracalendar_cloud')||'null');if(local?.supabaseUrl && local?.supabasePublishableKey)config=local;}catch{}
  if(config)await connect(config);
  else render();
}
async function connect(config){
  state.config=config;
  state.client=createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  try{
    const {data,error}=await state.client.auth.getSession();if(error)throw error;
    state.user=data.session?.user || null;
    if(state.user)await fetchRows();
  }catch(err){state.notice=err.message;state.error=true;}
  render();
}
async function fetchRows(){
  if(!state.client||!state.user)return;
  state.loading=true;render();
  try{
    const {start,end}=monthRange(state.year,state.month);
    const {data,error}=await state.client.from(TABLE).select('*').gte('scheduled_date',start).lt('scheduled_date',end).order('scheduled_date').order('created_at');
    if(error)throw error;
    state.rows=data||[];
  }catch(err){state.notice='Erro ao buscar vídeos. Confira a configuração da nuvem: '+err.message;state.error=true;state.rows=[];}
  finally{state.loading=false;render();}
}
function cloudSetup(){
  return '<section class="welcome"><div><span class="eyebrow">PASSO 01 · SUA NUVEM</span><h1>Seu calendário de vídeos.<br><em>Onde você estiver.</em></h1><p>Organize seus vídeos no computador e acesse os mesmos arquivos no celular, com login e armazenamento privado.</p><div class="features"><span>✓ Upload em lote</span><span>✓ Dias organizados</span><span>✓ Download no celular</span></div></div>'+
  '<form id="config-form" class="surface setup-form"><span class="tag">Configuração única por dispositivo</span><h2>Conectar armazenamento</h2><p>Crie um projeto Supabase dedicado e configure seu banco usando o arquivo SQL do repositório.</p><label>URL do projeto<input name="url" type="url" placeholder="https://seu-projeto.supabase.co" autocomplete="url" required value="'+attrs(state.config?.supabaseUrl||'')+'"></label><label>Publishable key / anon<input name="key" type="text" placeholder="sb_publishable_..." required autocomplete="off" value="'+attrs(state.config?.supabasePublishableKey||'')+'"></label><button type="submit" class="btn primary full">Conectar nuvem →</button><a href="https://github.com/nihgallehr-ia/viracalendar/blob/main/CONFIGURACAO.md" target="_blank" rel="noopener">Como preparar o Supabase ↗</a><small>Não use a chave secreta ou service_role. Apenas a chave pública.</small></form></section>'+demoCalendar();
}
function demoCalendar(){
  const days=monthDays(state.year,state.month);
  return '<section class="demo-head"><span class="eyebrow">PRÉVIA DO CALENDÁRIO</span><h2>Planeje o mês inteiro</h2><p>Visualização demonstrativa — conecte a nuvem para enviar e salvar seus vídeos.</p></section><div class="demo-calendar surface"><div class="calendar-top"><h3>'+monthName(state.year,state.month)+'</h3><span class="tag">Modo de apresentação</span></div><div class="week">'+['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(x=>'<div>'+x+'</div>').join('')+'</div><div class="days">'+days.map(d=>'<div class="date-cell '+(!d?'muted':'')+'"><b>'+(d?Number(d.slice(-2)):'')+'</b>'+(d&&[3,7,12,16,22,26].includes(Number(d.slice(-2)))?'<span class="count-chip">3 vídeos</span>':'')+'</div>').join('')+'</div></div>';
}
function authScreen(){
  return '<section class="auth-wrap"><div class="auth-visual"><span class="eyebrow">VIRACALENDAR ✦</span><h1>Seu conteúdo tem<br><em>endereço certo.</em></h1><p>Entre na sua conta para acessar seus vídeos agendados de qualquer dispositivo.</p><div class="mock-note">☁️ Arquivos privados, calendário sempre sincronizado.</div></div>'+
  '<form id="auth-form" class="surface auth-form"><span class="tag">Acesso privado</span><h2>'+(state.authMode==='login'?'Bem-vinda de volta!':'Criar minha conta')+'</h2><p>'+(state.authMode==='login'?'Acesse seu calendário de publicações.':'Use o mesmo email no computador e no celular.')+'</p><label>Email<input name="email" type="email" placeholder="seu@email.com" autocomplete="email" required></label><label>Senha<input name="password" type="password" placeholder="••••••••" minlength="6" autocomplete="'+(state.authMode==='login'?'current-password':'new-password')+'" required></label><button type="submit" class="btn primary full" '+(state.busy?'disabled':'')+'>'+(state.authMode==='login'?'Entrar no calendário':'Criar conta')+'</button><button type="button" class="link-btn" data-action="auth-switch">'+(state.authMode==='login'?'Ainda não tem conta? Cadastre-se':'Já tem conta? Entrar')+'</button><button type="button" class="link-btn subtle" data-action="settings">Configurações da nuvem</button></form></section>';
}
function renderCell(date,byDate){
  if(!date)return '<div class="day-cell outside"></div>';
  const arr=byDate[date]||[],posted=arr.filter(x=>x.status==='posted').length,sel=state.selected===date;
  return '<button type="button" class="day-cell '+(sel?'selected ':'')+(date===today()?'is-today ':'')+'" data-action="date" data-date="'+date+'"><span class="day-number">'+Number(date.slice(-2))+'</span>'+(arr.length?'<span class="count-chip">'+arr.length+' vídeo'+(arr.length>1?'s':'')+'</span><div class="dots"><span class="dot lavender"></span>'+(posted?'<span class="dot mint"></span>':'')+'</div>':'<span class="cell-plus">+</span>')+'</button>';
}
function videoCard(item){
  const posted=item.status==='posted',id=attrs(item.id);
  return '<article class="video-card"><div class="poster">'+(posted?'✓':'▶')+'</div><div class="video-details"><div class="video-title">'+escapeHtml(item.title)+'</div><div class="video-meta">'+escapeHtml(item.original_filename)+' · '+humanBytes(item.file_size||0)+'</div><div class="status '+(posted?'posted':'pending')+'">'+(posted?'✓ Publicado':'● A publicar')+'</div></div><div class="video-actions">'+
    '<button class="icon-button" data-action="preview" data-id="'+id+'" title="Assistir ao vídeo">▶</button>'+
    '<button class="icon-button download" data-action="download" data-id="'+id+'" title="Baixar vídeo">↓</button>'+
    '<button class="icon-button" data-action="mark" data-id="'+id+'" title="'+(posted?'Voltar para pendente':'Marcar como publicado')+'">'+(posted?'↶':'✓')+'</button>'+
    '<button class="icon-button" data-action="edit" data-id="'+id+'" title="Editar e reagendar">✎</button>'+
    '<button class="icon-button danger" data-action="delete" data-id="'+id+'" title="Excluir">×</button>'+
  '</div></article>';
}
function dashboard(){
  const byDate=countByDate(state.rows),selected=byDate[state.selected]||[],stats=statusCounts(state.rows),dates=monthDays(state.year,state.month),next=Object.entries(byDate).filter(([d])=>d>=today()).sort((a,b)=>a[0].localeCompare(b[0])).slice(0,4);
  return '<div class="dashboard"><div class="dash-heading"><div><span class="eyebrow">SEU ESTÚDIO DE CONTEÚDO</span><h1>Seu planejamento,<br><em>em dia.</em></h1><p>Produza no seu tempo. Publique no seu ritmo.</p></div><button class="btn primary upload-main" data-action="upload">＋ Adicionar vídeos</button></div>'+
  '<section class="summary">'+
    '<div class="summary-card"><span>Vídeos neste mês</span><strong>'+stats.total+'</strong><small>Conteúdos organizados</small></div>'+
    '<div class="summary-card"><span>Prontos para postar</span><strong>'+stats.planned+'</strong><small>Na sua programação</small></div>'+
    '<div class="summary-card"><span>Já publicados</span><strong>'+stats.posted+'</strong><small>Marcou como postado ✓</small></div>'+
  '</section><section class="content-grid"><div class="calendar-panel surface">'+
    '<div class="calendar-top"><div><span class="eyebrow">CALENDÁRIO EDITORIAL</span><h2>'+monthName(state.year,state.month)+'</h2></div><div class="calendar-controls"><button data-action="prev" aria-label="Mês anterior">‹</button><button class="today-btn" data-action="today">Hoje</button><button data-action="next" aria-label="Próximo mês">›</button></div></div>'+
    '<div class="week">'+['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(x=>'<div>'+x+'</div>').join('')+'</div><div class="days">'+dates.map(d=>renderCell(d,byDate)).join('')+'</div><div class="legend"><span><i class="dot lavender"></i> Programado</span><span><i class="dot mint"></i> Publicado</span></div>'+
  '</div><aside class="day-panel surface"><span class="eyebrow">CONTEÚDO DO DIA</span><h2>'+humanDate(state.selected)+'</h2><div class="day-summary">'+selected.length+' vídeo'+(selected.length===1?'':'s')+' agendado'+(selected.length===1?'':'s')+'</div>'+
    (state.loading?'<div class="placeholder">Carregando vídeos...</div>':selected.length?'<div class="videos">'+selected.map(videoCard).join('')+'</div>':'<div class="empty-day"><div class="empty-icon">▤</div><b>Dia livre por aqui!</b><p>Adicione vídeos para deixar este dia prontinho.</p></div>')+
    '<button class="btn outline full" data-action="upload">＋ Agendar neste dia</button>'+
    '<div class="upcoming"><h3>Próximas publicações</h3>'+ (next.length?next.map(([day,list])=>'<button data-action="date" data-date="'+day+'"><span>'+day.slice(8,10)+'/'+day.slice(5,7)+'</span><b>'+list.length+' vídeos</b></button>').join(''):'<p>Não há publicações futuras neste mês.</p>')+'</div>'+
  '</aside></section><footer class="footer">ViraCalendar © · Sua rotina de criação, organizada com carinho. 💜</footer></div>';
}
function modalWindow(body,wide=false){
  return '<div class="overlay" data-overlay="1"><section class="modal surface '+(wide?'wide':'')+'" role="dialog" aria-modal="true"><button class="close-modal" data-action="close" aria-label="Fechar">×</button>'+body+'</section></div>';
}
function uploadModal(){
  return modalWindow('<span class="eyebrow">NOVO CONTEÚDO</span><h2>Adicionar vídeos 💜</h2><p>Selecione vídeos editados e defina quando cada um será publicado.</p>'+
    '<label id="drop-area" class="drop-area"><span>☁</span><b>Escolha ou arraste seus vídeos</b><small>MP4, MOV, WEBM · máximo de 50 MB por arquivo no plano gratuito</small><input id="video-picker" type="file" accept="video/*,.mp4,.mov,.webm,.m4v" multiple></label>'+
    (state.draft.length?'<div class="draft-list">'+state.draft.map((d,i)=>'<div class="draft"><div class="draft-info"><b>'+escapeHtml(d.file.name)+'</b><small>'+humanBytes(d.file.size)+'</small><button data-action="draft-remove" data-index="'+i+'" title="Remover">×</button></div><div class="draft-fields"><label>Título<input data-title-index="'+i+'" maxlength="160" value="'+attrs(d.title)+'"></label><label>Dia de publicação<input data-date-index="'+i+'" type="date" value="'+attrs(d.date)+'"></label></div></div>').join('')+'</div>':'')+
    '<div class="modal-actions"><button class="btn outline" data-action="close">Cancelar</button><button class="btn primary" data-action="do-upload" '+(!state.draft.length||state.busy?'disabled':'')+'>'+(state.busy?'Enviando...':'Enviar '+state.draft.length+' vídeo'+(state.draft.length===1?'':'s'))+'</button></div>'+
    (state.uploadLabel?'<div class="upload-progress">'+escapeHtml(state.uploadLabel)+'</div>':'')
    ,true);
}
function editModal(){
  const x=state.edit;
  return modalWindow('<span class="eyebrow">EDITAR PUBLICAÇÃO</span><h2>Organizar vídeo</h2><form id="edit-form"><label>Título<input name="title" required maxlength="160" value="'+attrs(x.title)+'"></label><label>Dia de publicação<input name="date" type="date" required value="'+attrs(x.scheduled_date)+'"></label><label>Anotações<textarea name="notes" rows="3" placeholder="Produto, legenda, hashtags...">'+escapeHtml(x.notes||'')+'</textarea></label><div class="modal-actions"><button class="btn outline" type="button" data-action="close">Cancelar</button><button class="btn primary" type="submit" '+(state.busy?'disabled':'')+'>Salvar alterações</button></div></form>');
}
function previewModal(){
  const p=state.preview;
  return modalWindow('<span class="eyebrow">PRÉVIA DO VÍDEO</span><h2>'+escapeHtml(p.item.title)+'</h2><video controls playsinline preload="metadata" class="preview-video" src="'+attrs(p.url)+'"></video><div class="modal-actions"><button class="btn outline" data-action="close">Fechar</button><button class="btn primary" data-action="download" data-id="'+attrs(p.item.id)+'">↓ Baixar original</button></div>');
}
function settingsModal(){
  return modalWindow('<span class="eyebrow">CONFIGURAÇÕES</span><h2>Conexão com a nuvem</h2><p>Trocar a conexão desconecta sua conta neste dispositivo. Os vídeos do projeto anterior permanecem armazenados naquele projeto.</p>'+
    '<form id="config-form"><label>URL Supabase<input name="url" type="url" required value="'+attrs(state.config?.supabaseUrl||'')+'"></label><label>Publishable key (não secreta)<input name="key" type="text" required value="'+attrs(state.config?.supabasePublishableKey||'')+'"></label><div class="modal-actions"><button class="btn outline" type="button" data-action="close">Cancelar</button><button class="btn primary" type="submit">Salvar conexão</button></div></form>');
}
function render(){
  const logged=!!state.user;
  root.innerHTML='<header class="topbar"><a href="#" data-action="home" class="logo"><span class="logo-mark">✦</span> Vira<span>Calendar</span><small>STUDIO</small></a><nav><span class="header-pill">✿ Planeje • Crie • Publique</span>'+(logged?'<span class="account">'+escapeHtml(state.user.email||'')+'</span><button class="header-button" data-action="logout">Sair ↗</button>':state.client?'<button class="header-button" data-action="settings">⚙ Nuvem</button>':'<a href="https://github.com/nihgallehr-ia/viracalendar/blob/main/CONFIGURACAO.md" target="_blank" rel="noopener" class="header-button">Ajuda ↗</a>')+'</nav></header>'+
  '<main>'+(logged?dashboard():state.client?authScreen():cloudSetup())+'</main>'+
  (state.notice?'<div class="toast '+(state.error?'toast-error':'')+'"><span>'+escapeHtml(state.notice)+'</span><button data-action="dismiss">×</button></div>':'')+
  (state.modal==='upload'?uploadModal():state.modal==='edit'?editModal():state.modal==='preview'?previewModal():state.modal==='settings'?settingsModal():'');
}
function findRow(id){return state.rows.find(x=>x.id===id);}
function addFiles(fileList){
  const files=Array.from(fileList||[]);
  let skipped=0;
  for(const file of files){
    if(!(file.type.startsWith('video/')||/\.(mp4|mov|webm|m4v)$/i.test(file.name))||file.size>MAX_FILE||file.size===0){skipped++;continue;}
    state.draft.push({file,title:cleanFilename(file.name),date:state.selected});
  }
  state.notice=skipped?skipped+' arquivo(s) ignorado(s): formato inválido, vazio ou maior que 50 MB.':'';
  state.error=skipped>0;render();
}
async function guarded(fn){
  if(state.busy)return;state.busy=true;render();
  try{await fn();}
  catch(err){console.error(err);state.notice=(err.message||'Falha inesperada.');state.error=true;}
  finally{state.busy=false;render();}
}
async function uploadAll(){
  if(!state.user||!state.draft.length)return;
  const pending=[...state.draft];
  await guarded(async()=>{
    let success=0;
    for(let i=0;i<pending.length;i++){
      const d=pending[i];if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!d.title.trim())throw Error('Preencha o título e a data de todos os vídeos.');
      state.uploadLabel='Enviando '+(i+1)+' de '+pending.length+': '+d.file.name;render();
      const ext=(d.file.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,6);
      const path=state.user.id+'/'+crypto.randomUUID()+'.'+(ext||'mp4');
      const {error:uploadError}=await state.client.storage.from(BUCKET).upload(path,d.file,{upsert:false,contentType:d.file.type||'video/mp4'});
      if(uploadError)throw Error('Não foi possível enviar "'+d.file.name+'": '+uploadError.message);
      const {error:dbError}=await state.client.from(TABLE).insert({
        user_id:state.user.id,title:d.title.trim(),scheduled_date:d.date,notes:'',status:'planned',file_path:path,
        original_filename:d.file.name,file_size:d.file.size,mime_type:d.file.type||'video/mp4'
      });
      if(dbError){await state.client.storage.from(BUCKET).remove([path]);throw Error('Vídeo enviado, mas o cadastro falhou: '+dbError.message);}
      success++;state.draft=state.draft.filter(x=>x!==d);
    }
    state.uploadLabel='';state.modal='';state.notice=success+' vídeo(s) agendado(s) com sucesso!';state.error=false;
    const first=pending[0].date;state.selected=first;state.year=Number(first.slice(0,4));state.month=Number(first.slice(5,7))-1;
    await fetchRows();
  });
}
async function updateRow(item,patch){
  await guarded(async()=>{
    const {error}=await state.client.from(TABLE).update(patch).eq('id',item.id).eq('user_id',state.user.id);
    if(error)throw error;state.modal='';state.edit=null;state.notice='Publicação atualizada!';state.error=false;
    if(patch.scheduled_date){state.selected=patch.scheduled_date;state.year=Number(patch.scheduled_date.slice(0,4));state.month=Number(patch.scheduled_date.slice(5,7))-1;}
    await fetchRows();
  });
}
async function deleteVideo(item){
  if(!confirm('Excluir "'+item.title+'" do calendário e apagar o arquivo da nuvem? Esta ação não pode ser desfeita.'))return;
  await guarded(async()=>{
    const {error:storageError}=await state.client.storage.from(BUCKET).remove([item.file_path]);if(storageError)throw storageError;
    const {error}=await state.client.from(TABLE).delete().eq('id',item.id).eq('user_id',state.user.id);if(error)throw error;
    state.notice='Vídeo excluído.';state.error=false;await fetchRows();
  });
}
async function preview(item){
  await guarded(async()=>{
    const {data,error}=await state.client.storage.from(BUCKET).createSignedUrl(item.file_path,1200);
    if(error)throw error;state.preview={item,url:data.signedUrl};state.modal='preview';
  });
}
async function download(item){
  await guarded(async()=>{
    state.notice='Preparando o download de '+item.title+'...';render();
    const {data,error}=await state.client.storage.from(BUCKET).download(item.file_path);
    if(error)throw error;const url=URL.createObjectURL(data);
    const a=document.createElement('a');a.href=url;a.download=item.original_filename||'video.mp4';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    state.notice='Download iniciado! No iPhone, use Compartilhar → Salvar em Arquivos, se necessário.';state.error=false;
  });
}
async function saveCloud(form){
  const input=new FormData(form);
  const url=String(input.get('url')||'').trim().replace(/\/+$/,'');
  const key=String(input.get('key')||'').trim();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))return notice('Informe a URL HTTPS do seu projeto Supabase.',true);
  if(!key||key.startsWith('sb_secret_')||key.includes('service_role'))return notice('Atenção: utilize apenas a publishable key (ou anon), nunca uma chave secreta.',true);
  localStorage.setItem('viracalendar_cloud',JSON.stringify({supabaseUrl:url,supabasePublishableKey:key}));
  state.modal='';state.notice='Conexão salva neste dispositivo. Entre na sua conta.';state.error=false;
  await connect({supabaseUrl:url,supabasePublishableKey:key});
}
async function doAuth(form){
  const fd=new FormData(form),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');
  await guarded(async()=>{
    if(state.authMode==='login'){
      const {data,error}=await state.client.auth.signInWithPassword({email,password});
      if(error)throw error;state.user=data.user;state.notice='Você entrou! Bem-vinda ao seu calendário 💜';state.error=false;await fetchRows();
    }else{
      const {data,error}=await state.client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+import.meta.env.BASE_URL}});
      if(error)throw error;
      if(data.session){state.user=data.user;await fetchRows();}
      else{state.authMode='login';state.notice='Cadastro solicitado. Verifique seu email para confirmar a conta e depois entre.';state.error=false;}
    }
  });
}
root.addEventListener('click',async e=>{
  if(e.target.matches('[data-overlay]')){state.modal='';state.preview=null;render();return;}
  const b=e.target.closest('[data-action]');if(!b)return;
  e.preventDefault();const action=b.dataset.action,id=b.dataset.id,item=id?findRow(id):null;
  if(state.busy && !['dismiss'].includes(action))return;
  switch(action){
    case 'home':state.month=new Date().getMonth();state.year=new Date().getFullYear();state.selected=today();if(state.user)await fetchRows();else render();break;
    case 'date':{const d=b.dataset.date;if(state.selected!==d){state.selected=d;const y=Number(d.slice(0,4)),m=Number(d.slice(5,7))-1;if(y!==state.year||m!==state.month){state.year=y;state.month=m;await fetchRows();}else render();}break;}
    case 'prev':case 'next':{const d=shiftMonth(state.year,state.month,action==='next'?1:-1);state.year=d.year;state.month=d.month;state.selected=monthRange(d.year,d.month).start;await fetchRows();break;}
    case 'today':{const d=today();state.selected=d;state.year=Number(d.slice(0,4));state.month=Number(d.slice(5,7))-1;await fetchRows();break;}
    case 'upload':state.draft=[];state.uploadLabel='';state.modal='upload';render();break;
    case 'close':state.modal='';state.preview=null;render();break;
    case 'settings':state.modal='settings';render();break;
    case 'dismiss':state.notice='';render();break;
    case 'auth-switch':state.authMode=state.authMode==='login'?'signup':'login';state.notice='';render();break;
    case 'logout':await state.client.auth.signOut();state.user=null;state.rows=[];state.modal='';notice('Você saiu da sua conta.');break;
    case 'draft-remove':state.draft.splice(Number(b.dataset.index),1);render();break;
    case 'do-upload':await uploadAll();break;
    case 'preview':if(item)await preview(item);break;
    case 'download':if(item)await download(item);break;
    case 'mark':if(item)await updateRow(item,{status:item.status==='posted'?'planned':'posted'});break;
    case 'edit':if(item){state.edit={...item};state.modal='edit';render();}break;
    case 'delete':if(item)await deleteVideo(item);break;
  }
});
root.addEventListener('change',e=>{
  if(e.target.id==='video-picker')addFiles(e.target.files);
});
root.addEventListener('input',e=>{
  const a=e.target.dataset.titleIndex,b=e.target.dataset.dateIndex;
  if(a!==undefined&&state.draft[Number(a)])state.draft[Number(a)].title=e.target.value;
  if(b!==undefined&&state.draft[Number(b)])state.draft[Number(b)].date=e.target.value;
});
root.addEventListener('submit',async e=>{
  e.preventDefault();
  if(e.target.id==='config-form')await saveCloud(e.target);
  if(e.target.id==='auth-form')await doAuth(e.target);
  if(e.target.id==='edit-form' && state.edit){
    const fd=new FormData(e.target),title=String(fd.get('title')||'').trim(),date=String(fd.get('date')||''),notes=String(fd.get('notes')||'').slice(0,2000);
    if(!title||!date)return notice('Título e data são obrigatórios.',true);
    await updateRow(state.edit,{title,scheduled_date:date,notes});
  }
});
root.addEventListener('dragover',e=>{if(e.target.closest('#drop-area'))e.preventDefault();});
root.addEventListener('drop',e=>{if(e.target.closest('#drop-area')){e.preventDefault();addFiles(e.dataTransfer.files);}});
boot();
