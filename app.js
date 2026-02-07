"use strict";

const API_URL = "https://script.google.com/macros/s/AKfycbwu_uNzY8L8wOwWmWPYjLjm_LrEwdeWpuf9dKQfuG7B8VEwFpL_Vu_jPic8nJeRP5dX/exec";

// --- ESTADO ---
let membros = JSON.parse(localStorage.getItem("membros")) || ["Agente 1", "Agente 2"];
let tarefas = JSON.parse(localStorage.getItem("tarefas")) || ["Atendimento"];
let config = JSON.parse(localStorage.getItem("config")) || {};
let demandas = JSON.parse(localStorage.getItem("demandas")) || [];
let reunioes = JSON.parse(localStorage.getItem("reunioes")) || [];
let projetos = JSON.parse(localStorage.getItem("projetos")) || [];
let historico = JSON.parse(localStorage.getItem("historico")) || [];

const UNIDADES_TRABALHO = ["COTEC", "IDENTIFICAÇÃO FUNCIONAL", "IDENTIFICAÇÃO DE VISITANTES", "CONTROLE DE VEÍCULOS", "MONITORAMENTO DIGITAL"];

// Controles
let tarefaEmConfiguracao = null;
let demandaSendoSorteada = null;
let quillProjeto = null;
let projetoAtualIndex = null;
let demandasMinimizadas = false;
let reunioesMinimizadas = false;
let projetosMinimizados = false;

// --- SINCRONIZAÇÃO ---
async function salvarNoServidor(tipo, dados) {
    try {
        await fetch(API_URL, {
            method: "POST", mode: "no-cors",
            body: JSON.stringify({ tipo: tipo, dados: dados })
        });
    } catch (e) { console.error("Erro Sync", e); }
}

function salvarTudo() {
    // Local
    localStorage.setItem("membros", JSON.stringify(membros));
    localStorage.setItem("tarefas", JSON.stringify(tarefas));
    localStorage.setItem("config", JSON.stringify(config));
    localStorage.setItem("demandas", JSON.stringify(demandas));
    localStorage.setItem("reunioes", JSON.stringify(reunioes));
    localStorage.setItem("projetos", JSON.stringify(projetos));
    localStorage.setItem("historico", JSON.stringify(historico));

    // Nuvem
    salvarNoServidor("membros", membros);
    salvarNoServidor("tarefas", tarefas);
    salvarNoServidor("config", config);
    salvarNoServidor("demandas", demandas);
    salvarNoServidor("reunioes", reunioes);
    salvarNoServidor("projetos", projetos);
    salvarNoServidor("historico", historico);
}

async function carregarDadosDoServidor() {
    // Feedback visual nos botões
    document.querySelectorAll('.btn-sm-sync').forEach(b => b.innerText = "⏳");

    try {
        const r = await fetch(API_URL);
        const d = await r.json();

       if (d) {
            // 1. LIMPEZA TOTAL (Vacina)
            // [...new Set(...)] -> Remove nomes repetidos
            // .filter(...) -> Remove nomes vazios
            membros = [...new Set((d.membros || membros).filter(x => x && x.trim() !== ""))];
            tarefas = [...new Set((d.tarefas || tarefas).filter(x => x && x.trim() !== ""))];
            
            // 2. OBJETOS (Garante que tenham ID)
            demandas = (d.demandas || demandas).filter(x => x && x.id);
            reunioes = (d.reunioes || reunioes).filter(x => x && x.id);
            projetos = (d.projetos || projetos).filter(x => x && x.id);
            
            config = d.config || config;
            historico = d.escalas || historico;

            console.log("Dados limpos (sem vazios/repetidos) e sincronizados.");
            
            // Atualiza o LocalStorage para garantir que o PC fique limpo também
            localStorage.setItem("membros", JSON.stringify(membros));
            localStorage.setItem("tarefas", JSON.stringify(tarefas));
            
            init();
        }
    } catch (e) {
        console.warn("Erro sync", e);
    } finally {
        document.querySelectorAll('.btn-sm-sync').forEach(b => b.innerText = "🔄");
    }
}
// --- INIT ---
function init() {
    tarefas.forEach(t => { if (!config[t]) config[t] = { responsaveis: [] }; });
    renderListas();
    if(document.querySelectorAll("#presentes .ativo").length === 0) renderPainel();
    renderDemandas();
    renderReunioes();
    renderProjetos();
}

// --- CABEÇALHO ---
const CABECALHO_SEM_IMAGEM = (periodo) => `
    <div style="text-align: center; font-family: Arial; margin-bottom: 30px;">
        <h2 style="margin: 5px 0; font-size: 16pt;">COTEC - GESTÃO DE TECNOLOGIAS POLICIAIS</h2>
        <h3 style="margin: 0; font-size: 14pt;">DEPARTAMENTO DE POLÍCIA LEGISLATIVA</h3>
        <hr><h4 style="margin: 10px 0;"> : ${periodo}</h4>
    </div>
`;

// --- LISTAS ---
function addMembro() {
    // .trim() remove espaços antes e depois. " André " vira "André"
    const v = document.getElementById("novoMembro").value.trim();
    
    if (!v) return; // Se vazio, tchau.
    
    // O PORTEIRO: Se a lista já inclui esse nome, avisa e para tudo.
    if (membros.includes(v)) {
        alert("Este membro já existe na lista!");
        document.getElementById("novoMembro").value = ""; // Limpa o campo para não confundir
        return; 
    }

    membros.push(v);
    document.getElementById("novoMembro").value = "";
    renderListas();
    salvarTudo();
}

function addTarefa() {
    const v = document.getElementById("novaTarefa").value.trim();
    
    if (!v) return;
    
    if (tarefas.includes(v)) {
        alert("Esta tarefa já existe!");
        document.getElementById("novaTarefa").value = "";
        return;
    }

    tarefas.push(v);
    document.getElementById("novaTarefa").value = "";
    init();
    salvarTudo();
}
function removerMembro(i) { membros.splice(i,1); renderListas(); salvarTudo(); }
function removerTarefa(i) { tarefas.splice(i,1); renderListas(); salvarTudo(); }

function renderListas() {
    document.getElementById("listaMembros").innerHTML = membros.map((m,i)=>`<li>${m} <button onclick="removerMembro(${i})">x</button></li>`).join("");
    document.getElementById("listaTarefas").innerHTML = tarefas.map((t,i)=>`<li>${t} <button onclick="removerTarefa(${i})">x</button></li>`).join("");
    document.getElementById("presentes").innerHTML = membros.map(m=>`<div class="presente-toggle" onclick="toggleAtivo(this)">${m}</div>`).join("");
    document.getElementById("tarefasHoje").innerHTML = tarefas.map(t=>`<div class="presente-toggle" onclick="toggleAtivo(this)">${t}</div>`).join("");
}
function toggleAtivo(el) { el.classList.toggle('ativo'); renderPainel(); }

// --- PAINEL ---
function renderPainel() {
    const painel = document.getElementById("painelTarefas");
    const presentes = [...document.querySelectorAll("#presentes .ativo")].map(e=>e.innerText);
    const ativas = [...document.querySelectorAll("#tarefasHoje .ativo")].map(e=>e.innerText);
    
    painel.innerHTML = ativas.map(t => {
        const c = config[t] || { responsaveis: [] };
        const ocupados = c.responsaveis.map(r => r.pessoa);
        
        const respsHtml = c.responsaveis.map((r, i) => `
            <div style="background:#fff; padding:5px; margin-bottom:5px; border:1px solid #ddd; border-radius:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem;">
                    <span>${r.sorteado?'🎲':''} <b>${r.pessoa}</b></span>
                    <button onclick="removerResp('${t}',${i})" style="color:red; background:none; border:none; cursor:pointer">✖</button>
                </div>
                <input type="text" placeholder="Obs/VTR..." value="${r.obs || ''}" onchange="atualizarObsTarefa('${t}', ${i}, this.value)" style="font-size:0.65rem; padding:3px; border:1px solid #eee; margin-top:3px; width:100%">
            </div>`).join("");

        return `<div class="painel">
            <b style="font-size:0.8rem">${t.toUpperCase()}</b>
            <div style="margin-top:5px;">${respsHtml}</div>
            <select onchange="adicionarResp('${t}', this.value)" style="width:100%; margin-top:5px; font-size:0.7rem">
                <option value="">+ Agente</option>
                ${presentes.filter(p=>!ocupados.includes(p)).map(p=>`<option value="${p}">${p}</option>`).join("")}
            </select>
            <button class="btn-reset" style="width:100%; margin-top:3px" onclick="abrirModalSorteio('${t}')">Sortear</button>
        </div>`;
    }).join("");
}
function atualizarObsTarefa(t, i, v) { config[t].responsaveis[i].obs = v; } // Salva só ao gerar escala para não travar
function adicionarResp(t, p) { if(p) { config[t].responsaveis.push({pessoa: p, tipo: 'P', sorteado: false, obs: ''}); renderPainel(); }}
function removerResp(t, i) { config[t].responsaveis.splice(i, 1); renderPainel(); }
function resetarPainelEscala() { tarefas.forEach(t => config[t].responsaveis = []); renderPainel(); }

// --- ESCALA ---
function abrirModalData() { document.getElementById("modalData").style.display = "block"; }
function fecharModalData() { document.getElementById("modalData").style.display = "none"; }
function definirDataRapida(l) { 
    if(l==='AMANHÃ') { const d=new Date(); d.setDate(d.getDate()+1); gerarEscala("Dia "+d.toLocaleDateString()); }
    else gerarEscala("Esta Semana");
    fecharModalData();
}
function gerarEscalaCustom(modo) {
    if(modo==='especifica') { const d=document.getElementById("dataEsp").value; if(!d)return alert("Data?"); gerarEscala("Dia "+d.split('-').reverse().join('/')); }
    else { const i=document.getElementById("dataIni").value, f=document.getElementById("dataFim").value; if(!i||!f)return alert("Período?"); gerarEscala(i.split('-').reverse().join('/')+" a "+f.split('-').reverse().join('/')); }
    fecharModalData();
}
function gerarEscala(periodo) {
    const label = periodo === 'HOJE' ? new Date().toLocaleDateString() : periodo;
    const ativas = [...document.querySelectorAll("#tarefasHoje .ativo")].map(e=>e.innerText);
    let dist = {};
    ativas.forEach(t => { config[t].responsaveis.forEach(r => { if(!dist[r.pessoa]) dist[r.pessoa]=[]; dist[r.pessoa].push(r.obs ? `${t} (${r.obs})` : t); }); });
    historico.unshift({ data: label, distribuicao: dist });
    document.getElementById("tituloEscalaGerada").innerText = "ESCALA: " + label;
    document.getElementById("resultado").innerHTML = Object.entries(dist).map(([p, tasks]) => `<div style="padding:8px; border-bottom:1px solid #eee;"><b>${p}</b>: ${tasks.join(" | ")}</div>`).join("");
    document.getElementById("resultSection").classList.remove("hidden");
    salvarTudo();
}
function executarExport(formato) {
    const h = historico[0]; if(!h) return alert("Gere a escala!");
    if(formato === 'whats') {
        let m = `*COTEC - ESCALA*\n*DATA: ${h.data}*\n\n`;
        Object.entries(h.distribuicao).forEach(([p, t]) => m += `👤 *${p}*\n🛠 ${t.join(" | ")}\n\n`);
        window.open(`https://wa.me/?text=${encodeURIComponent(m)}`);
    } else {
        let html = `<html><body style="padding:40px; font-family:Arial;">${CABECALHO_SEM_IMAGEM(h.data)}<table border="1" style="width:100%;border-collapse:collapse"><tr style="background:#eee"><th style="padding:10px">Agente</th><th style="padding:10px">Atividades</th></tr>${Object.entries(h.distribuicao).map(([p, t]) => `<tr><td style="padding:10px"><b>${p}</b></td><td style="padding:10px">${t.join(" | ")}</td></tr>`).join("")}</table></body></html>`;
        if(formato==='print') { let w=window.open(""); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500); }
        else { const b=new Blob(['\ufeff',html],{type:'application/msword'}); const l=document.createElement('a'); l.href=URL.createObjectURL(b); l.download="Escala.doc"; l.click(); }
    }
}

// --- DEMANDAS ---
function toggleDemandas() { demandasMinimizadas = !demandasMinimizadas; renderDemandas(); }
function novaDemanda() {
    demandas.forEach(d => d.editando = false);
    demandas.unshift({ id:"d"+Date.now(), titulo:"", subtitulo:"", status:"", prioridade:"Normal", dataIni:"", dataFim:"", notas:"", responsaveis:[], unidades:[], editando:true, concluida:false });
    renderDemandas(); salvarTudo();
}
function renderDemandas() {
    const c = document.getElementById("listaDemandas"); if(!c) return;
    const seta=document.getElementById("setaDemandas"), cont=document.getElementById("contadorDemandas");
    const vis = demandas.filter(d=>!d.concluida).length;
    cont.innerText = demandasMinimizadas ? ` (${vis})` : ""; seta.innerText = demandasMinimizadas?"▶":"▼";
    if(demandasMinimizadas){ c.innerHTML=""; return; }
    
    c.innerHTML = demandas.filter(d=>!d.concluida).map((d,i) => {
        const idx = demandas.findIndex(x=>x.id===d.id);
        const cor = {'Urgente':'#ef4444','Alta':'#f97316','Normal':'#3b82f6','Baixa':'#94a3b8'}[d.prioridade]||'#3b82f6';
        
        if(d.editando) {
            return `
            <div class="demand-card" style="border-left:8px solid ${cor}">
                <div style="display:flex; justify-content:flex-end"><button class="btn-reset" onclick="alternarDemanda(${idx})">➖</button></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
                    <input placeholder="Título" value="${d.titulo}" oninput="demandas[${idx}].titulo=this.value" style="padding:8px; border:1px solid #ddd; width:100%">
                    <input placeholder="Subtítulo" value="${d.subtitulo}" oninput="demandas[${idx}].subtitulo=this.value" style="padding:8px; border:1px solid #ddd; width:100%">
                </div>
                <input placeholder="Status" value="${d.status}" oninput="demandas[${idx}].status=this.value" style="width:100%; padding:8px; border:1px solid #ddd; margin-bottom:10px">
                <div style="display:flex; gap:10px; margin-bottom:10px">
                    <input type="date" value="${d.dataIni}" oninput="demandas[${idx}].dataIni=this.value">
                    <input type="date" value="${d.dataFim}" oninput="demandas[${idx}].dataFim=this.value">
                    <select onchange="demandas[${idx}].prioridade=this.value"><option ${d.prioridade==='Baixa'?'selected':''}>Baixa</option><option ${d.prioridade==='Normal'?'selected':''}>Normal</option><option ${d.prioridade==='Alta'?'selected':''}>Alta</option><option ${d.prioridade==='Urgente'?'selected':''}>Urgente</option></select>
                </div>
                <textarea id="edit_notas_${d.id}" style="width:100%; height:100px">${d.notas||''}</textarea>
                <div style="background:#f1f5f9; padding:10px; margin:10px 0">
                    <b>Equipe:</b> <button class="btn-reset" onclick="abrirSorteioDemanda(${idx})">🎲 Sortear</button>
                    <div class="chip-container">${membros.map(m=>`<div class="presente-toggle ${d.responsaveis.find(x=>x.pessoa===m)?'ativo':''}" onclick="toggleRespDemanda(${idx},'${m}',this)">${m}</div>`).join("")}</div>
                </div>
                <div style="display:flex; gap:10px">
                    <button class="btn-accent" onclick="gravarDemanda(${idx})">✅ GRAVAR</button>
                    <button class="btn-reset" onclick="removerDemanda(${idx})" style="color:red">Excluir</button>
                </div>
            </div>`;
        } else {
            return `
            <div class="demand-card" style="border-left:8px solid ${cor}; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1">
                    <span style="background:${cor}; color:white; padding:2px 5px; border-radius:4px; font-size:0.7rem">${d.prioridade}</span>
                    <b>${d.titulo||'Sem título'}</b>
                    <div style="font-size:0.8rem; color:#666">${d.subtitulo||''}</div>
                    <div style="font-size:0.75rem; color:#888">📅 ${d.dataIni||'-'} a ${d.dataFim||'-'} | 👤 ${d.responsaveis.map(r=>r.pessoa).join(", ")}</div>
                </div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <button class="btn-exp" title="Imprimir" onclick="exportarUnicaDemanda(${idx},'print')">🖨️</button>
                    <button class="btn-exp" title="Word" onclick="exportarUnicaDemanda(${idx},'word')">📄</button>
                    <button class="btn-exp" title="WhatsApp" onclick="exportarUnicaDemanda(${idx},'whats')">📲</button>
                    <button class="btn-reset" onclick="alternarDemanda(${idx})">✏️</button>
                    <button class="btn-reset" onclick="marcarDemandaConcluida(${idx})">✅</button>
                    <button class="btn-reset" style="color:red" onclick="removerDemanda(${idx})">🗑️</button>
                </div>
            </div>`;
        }
    }).join("");
    // Init Quills if needed (timeout)
    demandas.forEach(d => { if(d.editando) setTimeout(() => { const q = new Quill(`#edit_notas_${d.id}`, {theme:'snow'}); q.root.innerHTML=d.notas||''; q.on('text-change',()=>d.notas=q.root.innerHTML); }, 10); });
}

function gravarDemanda(i) { demandas[i].editando = false; renderDemandas(); salvarTudo(); }
function alternarDemanda(i) { demandas[i].editando = !demandas[i].editando; renderDemandas(); }
function removerDemanda(i) { if(confirm("Excluir?")) demandas.splice(i,1); renderDemandas(); salvarTudo(); }
function marcarDemandaConcluida(i) { if(confirm("Concluir?")){ demandas[i].concluida = true; demandas[i].editando = false; renderDemandas(); salvarTudo(); }}
function toggleRespDemanda(idx,m,el) { 
    const d=demandas[idx]; const i=d.responsaveis.findIndex(x=>x.pessoa===m); 
    if(i>-1){d.responsaveis.splice(i,1);el.classList.remove("ativo")}else{d.responsaveis.push({pessoa:m,tipo:'P'});el.classList.add("ativo")}
}

function exportarUnicaDemanda(i, f) { exportarDemandasRelatorio([demandas[i]], f); }
function exportarDemandasLote(f) { const s=demandas.filter(d=>!d.concluida); if(!s.length)return alert("Nada para exportar"); exportarDemandasRelatorio(s,f); }
function exportarDemandasRelatorio(lista, f) {
    if(f==='whats') {
        const t = lista.map(d=>`📌 *${d.titulo}*\n🔹 ${d.subtitulo||''}\n📅 ${d.dataIni||'-'} a ${d.dataFim||'-'}\nStatus: ${d.status}\nEquipe: ${d.responsaveis.map(r=>r.pessoa).join(', ')}`).join("\n\n");
        window.open(`https://wa.me/?text=${encodeURIComponent(t)}`);
    } else {
        const h = `<html><body style="font-family:Arial; padding:40px">${CABECALHO_SEM_IMAGEM("DEMANDAS")}${lista.map(d=>`<div style="border:1px solid #ccc; padding:15px; margin-bottom:10px; border-left:5px solid black"><h3>${d.titulo}</h3><p>${d.subtitulo}</p><p><b>Data:</b> ${d.dataIni} a ${d.dataFim} | <b>Status:</b> ${d.status}</p><p><b>Equipe:</b> ${d.responsaveis.map(r=>r.pessoa).join(', ')}</p><hr><div>${d.notas}</div></div>`).join("")}</body></html>`;
        if(f==='print') { let w=window.open(""); w.document.write(h); w.document.close(); setTimeout(()=>w.print(),500); }
        else { const b=new Blob(['\ufeff',h],{type:'application/msword'}); const l=document.createElement('a'); l.href=URL.createObjectURL(b); l.download="Demandas.doc"; l.click(); }
    }
}
// Demandas Concluídas
function abrirDemandasConcluidas() { renderDemandasConcluidas(); document.getElementById("modalDemandasConcluidas").style.display="block"; }
function fecharDemandasConcluidas() { document.getElementById("modalDemandasConcluidas").style.display="none"; }
function renderDemandasConcluidas() {
    document.getElementById("listaDemandasConcluidas").innerHTML = demandas.filter(d=>d.concluida).map(d=>`<div class="demand-card"><b>${d.titulo}</b> <button onclick="reabrirDemanda('${d.id}')">Reabrir</button> <button onclick="excluirDemandaConcluida('${d.id}')" style="color:red">Excluir</button></div>`).join("");
}
function reabrirDemanda(id){ const d=demandas.find(x=>x.id===id); d.concluida=false; d.editando=true; fecharDemandasConcluidas(); renderDemandas(); salvarTudo(); }
function excluirDemandaConcluida(id){ if(confirm("Excluir?")){ const i=demandas.findIndex(x=>x.id===id); demandas.splice(i,1); renderDemandasConcluidas(); salvarTudo(); }}

// --- REUNIÕES (ORIGINAL RESTAURADO) ---
function toggleReunioes() { reunioesMinimizadas = !reunioesMinimizadas; renderReunioes(); }
function novaReuniao() { 
    reunioes.forEach(r=>r.editando=false);
    reunioes.unshift({id:"r"+Date.now(), titulo:"", subtitulo:"", data:"", convocador:"", participantes:{modo:"manual",equipe:[],convidados:[]}, unidades:[], pautas:[], textoLivre:"", editando:true});
    renderReunioes(); salvarTudo();
}
function renderReunioes() {
    const c = document.getElementById("listaReunioes"); if(!c) return;
    const cont=document.getElementById("contadorReunioes"), seta=document.getElementById("setaReunioes");
    cont.innerText=reunioesMinimizadas?` (${reunioes.length})`:""; seta.innerText=reunioesMinimizadas?"▶":"▼";
    if(reunioesMinimizadas) { c.innerHTML=""; return; }

    c.innerHTML = reunioes.map((r, i) => {
        if(r.editando) {
            return `
            <div class="demand-card">
                <div style="display:flex; justify-content:flex-end"><button class="btn-reset" onclick="alternarReuniao(${i})">➖</button></div>
                <input placeholder="Título Reunião" value="${r.titulo}" onchange="reunioes[${i}].titulo=this.value" style="font-size:1.1rem; width:100%; margin-bottom:5px">
                <input placeholder="Subtítulo" value="${r.subtitulo}" onchange="reunioes[${i}].subtitulo=this.value" style="width:100%; margin-bottom:5px">
                <div style="display:flex; gap:10px; margin-bottom:10px">
                    <input type="date" value="${r.data}" onchange="reunioes[${i}].data=this.value">
                    <input placeholder="Convocador" value="${r.convocador}" onchange="reunioes[${i}].convocador=this.value" style="flex:1">
                </div>
                <hr>
                <b>Participantes:</b>
                <div style="display:flex; gap:5px; margin:5px 0">
                    <button class="btn-reset" onclick="setModoPart(${i},'manual')">Selecionar</button>
                    <button class="btn-reset" onclick="setModoPart(${i},'equipe')">Toda Equipe</button>
                    <button class="btn-reset" onclick="setModoPart(${i},'presentes')">Presentes</button>
                    <button class="btn-reset" onclick="addConvidado(${i})">+ Convidado</button>
                </div>
                <div id="part_reuniao_${i}" class="chip-container">
                    ${renderPartReuniao(i)}
                </div>
                <div style="margin-top:10px">
                    <b>Unidades:</b>
                    <div class="chip-container">
                         ${UNIDADES_TRABALHO.map(u => `<div class="presente-toggle ${(r.unidades||[]).includes(u)?'ativo':''}" onclick="toggleUnidadeReuniao(${i},'${u}',this)">${u}</div>`).join("")}
                    </div>
                </div>
                <hr>
                <b>Pautas:</b> <button onclick="addPauta(${i})">+</button>
                <div id="pautas_${i}">${r.pautas.map((p,pi)=>`<div style="margin-top:5px"><input value="${p.tema}" placeholder="Tema" onchange="reunioes[${i}].pautas[${pi}].tema=this.value" style="width:100%"><textarea placeholder="Comentário" onchange="reunioes[${i}].pautas[${pi}].comentario=this.value" style="width:100%">${p.comentario}</textarea></div>`).join("")}</div>
                <hr>
                <textarea rows="4" placeholder="Obs Gerais" onchange="reunioes[${i}].textoLivre=this.value" style="width:100%">${r.textoLivre}</textarea>
                <div style="margin-top:10px; display:flex; gap:10px">
                    <button class="btn-accent" onclick="salvarReuniao(${i})">Salvar</button>
                    <button class="btn-reset" style="color:red" onclick="excluirReuniao(${i})">Excluir</button>
                </div>
            </div>`;
        } else {
            return `
            <div class="demand-card" style="display:flex; justify-content:space-between; align-items:center">
                <div><b>${r.titulo||'Reunião'}</b><br><small>${r.data}</small></div>
                <div style="display:flex; gap:5px">
                    <button class="btn-exp" onclick="exportarReuniao(${i},'print')">🖨️</button>
                    <button class="btn-exp" onclick="exportarReuniao(${i},'word')">📄</button>
                    <button class="btn-exp" onclick="exportarReuniao(${i},'whats')">📲</button>
                    <button class="btn-reset" onclick="alternarReuniao(${i})">✏️</button>
                    <button class="btn-reset" style="color:red" onclick="excluirReuniao(${i})">🗑️</button>
                </div>
            </div>`;
        }
    }).join("");
}
function alternarReuniao(i){ reunioes[i].editando = !reunioes[i].editando; renderReunioes(); }
function salvarReuniao(i){ reunioes[i].editando=false; renderReunioes(); salvarTudo(); }
function excluirReuniao(i){ reunioes.splice(i,1); renderReunioes(); salvarTudo(); }
function setModoPart(i, modo) {
    if(modo==='equipe') reunioes[i].participantes.equipe = [...membros];
    if(modo==='presentes') reunioes[i].participantes.equipe = [...document.querySelectorAll("#presentes .ativo")].map(e=>e.innerText);
    renderReunioes();
}
function renderPartReuniao(i) {
    const r = reunioes[i];
    let html = membros.map(m => `<div class="presente-toggle ${r.participantes.equipe.includes(m)?'ativo':''}" onclick="togglePartReuniao(${i},'${m}',this)">${m}</div>`).join("");
    if(r.participantes.convidados.length) html += r.participantes.convidados.map(c=>`<div class="presente-toggle ativo" onclick="remConvidado(${i},'${c}')">${c} (Convidado)</div>`).join("");
    return html;
}
function togglePartReuniao(i,m,el) {
    const list=reunioes[i].participantes.equipe; const idx=list.indexOf(m);
    if(idx>-1){list.splice(idx,1);el.classList.remove('ativo')}else{list.push(m);el.classList.add('ativo')}
}
function addConvidado(i){ const n=prompt("Nome:"); if(n){ reunioes[i].participantes.convidados.push(n); renderReunioes(); }}
function remConvidado(i,n){ const list=reunioes[i].participantes.convidados; const idx=list.indexOf(n); if(idx>-1) list.splice(idx,1); renderReunioes(); }
function toggleUnidadeReuniao(i,u,el){ 
    if(!reunioes[i].unidades) reunioes[i].unidades=[]; 
    const list=reunioes[i].unidades; const idx=list.indexOf(u);
    if(idx>-1){list.splice(idx,1);el.classList.remove('ativo')}else{list.push(u);el.classList.add('ativo')}
}
function addPauta(i){ reunioes[i].pautas.push({tema:"",comentario:""}); renderReunioes(); }

function exportarReuniao(i, f) {
    const r = reunioes[i];
    const parts = [...r.participantes.equipe, ...r.participantes.convidados].join(", ");
    const units = (r.unidades||[]).join(", ");
    if(f==='whats') {
        const txt = `*REUNIÃO*\n*${r.titulo}*\n_${r.subtitulo}_\n\n👤 Convocador: ${r.convocador}\n👥 Participantes: ${parts}\n🏢 Unidades: ${units}\n\n📌 Pautas:\n${r.pautas.map((p,x)=>`${x+1}. ${p.tema} — ${p.comentario}`).join('\n')}\n\n📝 Obs: ${r.textoLivre}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`);
    } else {
        const h = `<html><body style="font-family:Arial; padding:40px">${CABECALHO_SEM_IMAGEM("REUNIÃO")}<h2>${r.titulo}</h2><h4>${r.subtitulo}</h4><p><b>Convocador:</b> ${r.convocador}</p><p><b>Participantes:</b> ${parts}</p><p><b>Unidades:</b> ${units}</p><hr><h3>Pautas</h3><ul>${r.pautas.map(p=>`<li><b>${p.tema}</b>: ${p.comentario}</li>`).join("")}</ul><hr><p>${r.textoLivre}</p></body></html>`;
        if(f==='print') { let w=window.open(""); w.document.write(h); w.document.close(); setTimeout(()=>w.print(),500); }
        else { const b=new Blob(['\ufeff',h],{type:'application/msword'}); const l=document.createElement('a'); l.href=URL.createObjectURL(b); l.download="Reuniao.doc"; l.click(); }
    }
}

// --- PROJETOS (CORRIGIDO E OTIMIZADO) ---
function toggleProjetos() { projetosMinimizados = !projetosMinimizados; renderProjetos(); }
function novoProjeto() {
    projetos.unshift({ id: "p" + Date.now(), interessados: [], titulo: "", periodo: "", progresso: 0, descricao: "" });
    renderProjetos(); salvarTudo();
}
function renderProjetos() {
    const c = document.getElementById("listaProjetos"); if(!c) return;
    const cont=document.getElementById("contadorProjetos"), seta=document.getElementById("setaProjetos");
    cont.innerText = projetosMinimizados ? ` (${projetos.length})` : ""; seta.innerText=projetosMinimizados?"▶":"▼";
    if(projetosMinimizados){c.innerHTML="";return;}

    c.innerHTML = projetos.map((p, i) => `
        <div class="demand-card">
            <div style="display:flex; justify-content:flex-end; gap:5px; margin-bottom:5px">
                 <button class="btn-exp" onclick="exportarProjeto(${i},'print')">🖨️</button>
                 <button class="btn-exp" onclick="exportarProjeto(${i},'word')">📄</button>
                 <button class="btn-exp" onclick="exportarProjeto(${i},'whats')">📲</button>
            </div>
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px">
                <input placeholder="Título do Projeto" value="${p.titulo}" onchange="projetos[${i}].titulo=this.value; salvarTudo()" style="flex:1; font-weight:bold">
                <input placeholder="Período" value="${p.periodo}" onchange="projetos[${i}].periodo=this.value; salvarTudo()" style="width:120px">
            </div>
            <div style="margin-bottom:10px">
                <small>Interessados:</small>
                <div class="chip-container">
                    ${["DEPOL","COTEC","IDENTIFICAÇÃO FUNCIONAL","IDENTIFICAÇÃO DE VISITANTES","CREDENCIAMENTO DE VEÍCULOS"].map(dep => `
                        <div class="presente-toggle ${(p.interessados||[]).includes(dep)?'ativo':''}" onclick="toggleInteressadoProj(${i},'${dep}',this)">${dep}</div>
                    `).join("")}
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px">
                <div style="flex:1; background:#eee; height:10px; border-radius:5px">
                    <div style="width:${p.progresso}%; background:${corProgresso(p.progresso)}; height:100%; border-radius:5px"></div>
                </div>
                <input type="number" value="${p.progresso}" onchange="projetos[${i}].progresso=Number(this.value); renderProjetos(); salvarTudo()" style="width:50px">%
            </div>
            <div style="margin-top:10px; display:flex; gap:5px">
                <button class="btn-reset" onclick="abrirDescricaoProjeto(${i})">📝 Descrição</button>
                <button class="btn-reset" style="color:red" onclick="excluirProjeto(${i})">🗑️ Excluir</button>
            </div>
        </div>
    `).join("");
}
function toggleInteressadoProj(i, dep, el) {
    if(!projetos[i].interessados) projetos[i].interessados=[];
    const list = projetos[i].interessados; const idx = list.indexOf(dep);
    if(idx > -1) { list.splice(idx,1); el.classList.remove('ativo'); } else { list.push(dep); el.classList.add('ativo'); }
    salvarTudo();
}
function excluirProjeto(i) { if(confirm("Excluir?")){ projetos.splice(i,1); renderProjetos(); salvarTudo(); }}
function corProgresso(p) { if(p>=80) return "#16a34a"; if(p>=40) return "#facc15"; return "#ef4444"; }
function exportarProjeto(i, f) {
    const p = projetos[i];
    if(f==='whats') {
        const t = `📌 *PROJETO: ${p.titulo}*\n📅 ${p.periodo}\n📊 Progresso: ${p.progresso}%\n👥 Interessados: ${(p.interessados||[]).join(', ')}\n\n📝 Descrição: ${p.descricao.replace(/<[^>]+>/g, '')}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(t)}`);
    } else {
        const h = `<html><body style="font-family:Arial; padding:40px">${CABECALHO_SEM_IMAGEM("PROJETO")}<h2>${p.titulo}</h2><p><b>Período:</b> ${p.periodo}</p><p><b>Progresso:</b> ${p.progresso}%</p><p><b>Interessados:</b> ${(p.interessados||[]).join(', ')}</p><hr><h3>Descrição</h3><div>${p.descricao}</div></body></html>`;
        if(f==='print') { let w=window.open(""); w.document.write(h); w.document.close(); setTimeout(()=>w.print(),500); }
        else { const b=new Blob(['\ufeff',h],{type:'application/msword'}); const l=document.createElement('a'); l.href=URL.createObjectURL(b); l.download="Projeto.doc"; l.click(); }
    }
}
// Modal Projetos
function abrirDescricaoProjeto(i) { 
    projetoAtualIndex = i; document.getElementById("modalProjeto").style.display = "block";
    if(!quillProjeto) quillProjeto = new Quill("#editorProjeto", { theme: "snow" });
    quillProjeto.root.innerHTML = projetos[i].descricao || "";
}
function fecharModalProjeto() { document.getElementById("modalProjeto").style.display = "none"; }
function gravarDescricaoProjeto() {
    if(projetoAtualIndex !== null) { projetos[projetoAtualIndex].descricao = quillProjeto.root.innerHTML; salvarTudo(); fecharModalProjeto(); }
}

// --- SORTEIOS E MODAIS AUXILIARES ---
function abrirModalSorteio(t) {
    tarefaEmConfiguracao = t;
    const p = [...document.querySelectorAll("#presentes .ativo")].map(e=>e.innerText);
    document.getElementById("elegiveisContainer").innerHTML = p.map(x=>`<div class="presente-toggle ativo" onclick="this.classList.toggle('ativo')">${x}</div>`).join("");
    document.getElementById("modalSorteio").style.display = "block";
}
function fecharModal() { document.getElementById("modalSorteio").style.display = "none"; }
function confirmarSorteio() {
    const s = [...document.querySelectorAll("#elegiveisContainer .ativo")].map(e=>e.innerText);
    const n = parseInt(document.getElementById("qtdTotal").value);
    s.sort(() => 0.5 - Math.random()).slice(0, n).forEach(p => config[tarefaEmConfiguracao].responsaveis.push({ pessoa: p, tipo: 'P', sorteado: true, obs: '' }));
    renderPainel(); fecharModal(); salvarTudo();
}
function abrirSorteioDemanda(i) {
    demandaSendoSorteada = i; const d = demandas[i];
    const elegiveis = membros.filter(m => !d.responsaveis.some(r => r.pessoa === m));
    document.getElementById("elegiveisDemandaContainer").innerHTML = elegiveis.map(m => `<div class="presente-toggle ativo" onclick="this.classList.toggle('ativo')">${m}</div>`).join("");
    document.getElementById("modalSorteioDemanda").style.display = "block";
}
function confirmarSorteioDemanda() {
    const d = demandas[demandaSendoSorteada];
    const sel = [...document.querySelectorAll("#elegiveisDemandaContainer .ativo")].map(e => e.innerText);
    const qtd = parseInt(document.getElementById("qtdTotalDem").value) || 1;
    sel.sort(() => 0.5 - Math.random()).slice(0, qtd).forEach(p => { d.responsaveis.push({ pessoa: p, tipo: "P", sorteado: true }); });
    fecharModalDemanda(); renderDemandas(); salvarTudo();
}
function fecharModalDemanda() { document.getElementById("modalSorteioDemanda").style.display = "none"; }

// Start
window.onload = carregarDadosDoServidor;