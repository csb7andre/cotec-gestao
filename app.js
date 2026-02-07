"use strict";

const API_URL = "https://script.google.com/macros/s/AKfycbxvn6M4uuNVJFqXTw_oOeo-w1mwIQspUtrgFxYPbTFQKUZ_Mu7Z1ciJ0qAjiNu_Zl4N/exec";



const CABECALHO_COMPLETO = (periodo) => `
    <div style="text-align: center; font-family: Arial; margin-bottom: 30px;">
        <img src="simbolo.jpg" width="80" height="80">
        <h2 style="margin: 5px 0; font-size: 16pt;">
            COTEC - COORDENAÇÃO DE GESTÃO DE TECNOLOGIAS POLICIAIS E CREDENCIAMENTO
        </h2>
        <h3 style="margin: 0; font-size: 14pt;">
            DEPARTAMENTO DE POLÍCIA LEGISLATIVA
        </h3>
        <hr>
        <h4 style="margin: 10px 0;">RELATÓRIO: ${periodo}</h4>
    </div>
`;
const CABECALHO_SEM_IMAGEM = (periodo) => `
    <div style="text-align: center; font-family: Arial; margin-bottom: 30px;">
        <h2 style="margin: 5px 0; font-size: 16pt;">
            COTEC - COORDENAÇÃO DE GESTÃO DE TECNOLOGIAS POLICIAIS E CREDENCIAMENTO
        </h2>
        <h3 style="margin: 0; font-size: 14pt;">
            DEPARTAMENTO DE POLÍCIA LEGISLATIVA
        </h3>
        <hr>
        <h4 style="margin: 10px 0;">RELATÓRIO: ${periodo}</h4>
    </div>
`;


// function salvarTudo() { ... }
let membros = JSON.parse(localStorage.getItem("membros")) || ["Agente 1", "Agente 2"];
let tarefas = JSON.parse(localStorage.getItem("tarefas")) || ["Atendimento"];
let config = JSON.parse(localStorage.getItem("config")) || {};
let demandas = JSON.parse(localStorage.getItem("demandas")) || [];
let reunioes = JSON.parse(localStorage.getItem("reunioes")) || [];
const UNIDADES_TRABALHO = [
    "COTEC",
    "IDENTIFICAÇÃO FUNCIONAL",
    "IDENTIFICAÇÃO DE VISITANTES",
    "CONTROLE DE VEÍCULOS",
    "MONITORAMENTO DIGITAL"
];
let projetos = JSON.parse(localStorage.getItem("projetos")) || [];


let historico = JSON.parse(localStorage.getItem("historico")) || [];
let tarefaEmConfiguracao = null;
let demandaSendoSorteada = null;

function salvarTudo() {
    localStorage.setItem("membros", JSON.stringify(membros));
    localStorage.setItem("tarefas", JSON.stringify(tarefas));
    localStorage.setItem("config", JSON.stringify(config));
    localStorage.setItem("demandas", JSON.stringify(demandas));
    localStorage.setItem("historico", JSON.stringify(historico));
    localStorage.setItem("reunioes", JSON.stringify(reunioes));
localStorage.setItem("projetos", JSON.stringify(projetos));


}

function init() {
    tarefas.forEach(t => { if (!config[t]) config[t] = { responsaveis: [] }; });

    // garante que TODAS as reuniões iniciem minimizadas
    reunioes.forEach(r => r.editando = false);

    renderListas();
    renderDemandas();
    renderReunioes(); // <<< ESSENCIAL
renderProjetos();

}


// --- AUXILIARES ---
function getCorPrio(p) {
    const cores = {'Urgente':'#ef4444','Alta':'#f97316','Normal':'#3b82f6','Baixa':'#94a3b8'};
    return cores[p] || '#3b82f6';
}
function getCorProgresso(p) {
    if (p >= 70) return "#22c55e";   // verde
    if (p >= 40) return "#facc15";   // amarelo
    return "#ef4444";                // vermelho
}


function renderListas() {
    document.getElementById("listaMembros").innerHTML = membros.map((m,i)=>`<li>${m} <button onclick="removerMembro(${i})">x</button></li>`).join("");
    document.getElementById("listaTarefas").innerHTML = tarefas.map((t,i)=>`<li>${t} <button onclick="removerTarefa(${i})">x</button></li>`).join("");
    document.getElementById("presentes").innerHTML = membros.map(m=>`<div class="presente-toggle" onclick="toggleAtivo(this)">${m}</div>`).join("");
    document.getElementById("tarefasHoje").innerHTML = tarefas.map(t=>`<div class="presente-toggle" onclick="toggleAtivo(this)">${t}</div>`).join("");
}

function toggleAtivo(el) { el.classList.toggle('ativo'); renderPainel(); }

// --- PAINEL COM CAMPO DE OBSERVAÇÃO ---
function renderPainel() {
    const painel = document.getElementById("painelTarefas");
    const presentes = [...document.querySelectorAll("#presentes .ativo")].map(e=>e.innerText);
    const ativas = [...document.querySelectorAll("#tarefasHoje .ativo")].map(e=>e.innerText);
    
    painel.innerHTML = ativas.map(t => {
        const c = config[t] || { responsaveis: [] };
        const ocupados = c.responsaveis.map(r => r.pessoa);
        
        const respsHtml = c.responsaveis.map((r, i) => `
            <div style="display:flex; flex-direction:column; background:#fff; padding:5px; margin-bottom:5px; border:1px solid #ddd; border-radius:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem;">
                    <span>${r.sorteado?'🎲':''} <b>${r.pessoa}</b></span>
                    <button onclick="removerResp('${t}',${i})" style="color:red; background:none;">x</button>
                </div>
                <input type="text" placeholder="Obs/VTR/Posto..." value="${r.obs || ''}" 
                       onchange="atualizarObsTarefa('${t}', ${i}, this.value)"
                       style="font-size:0.65rem; padding:3px; border:1px solid #eee; margin-top:3px;">
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

function atualizarObsTarefa(t, i, v) { config[t].responsaveis[i].obs = v; salvarTudo(); }
function adicionarResp(t, p) { if(p) { config[t].responsaveis.push({pessoa: p, tipo: 'P', sorteado: false, obs: ''}); renderPainel(); } }
function removerResp(t, i) { config[t].responsaveis.splice(i, 1); renderPainel(); }
function resetarPainelEscala() { tarefas.forEach(t => config[t].responsaveis = []); renderPainel(); }

// --- ESCALA E DATAS ---
function abrirModalData() { document.getElementById("modalData").style.display = "block"; }
function fecharModalData() { document.getElementById("modalData").style.display = "none"; }
// ===============================
// PROJETOS – MODAL
// ===============================

let quillProjeto = null;
let projetoAtualIndex = null;
let filtroProgressoProjetos = "todos";
let demandasMinimizadas = false;
let reunioesMinimizadas = false;
let projetosMinimizados = false;





function abrirDescricaoProjeto(i) {
    projetoAtualIndex = i;

    const modal = document.getElementById("modalProjeto");
    modal.style.display = "flex"; // ⚠️ ISSO É O PONTO-CHAVE

    if (!quillProjeto) {
        quillProjeto = new Quill("#editorProjeto", {
            theme: "snow"
        });
    }

    quillProjeto.root.innerHTML = projetos[i].descricao || "";
}





function abrirModalProjeto() {
    const modal = document.getElementById("modalProjeto");
    modal.style.display = "flex";

    // inicializa o editor apenas uma vez
    if (!quillProjeto) {
        quillProjeto = new Quill("#editorProjeto", {
            theme: "snow"
        });
    }
}



function gerarEscalaCustom(modo) {
    let p = "";
    if(modo === 'especifica') {
        const d = document.getElementById("dataEsp").value;
        if(!d) return alert("Selecione a data!");
        p = "Dia " + d.split('-').reverse().join('/');
    } else {
        const i = document.getElementById("dataIni").value;
        const f = document.getElementById("dataFim").value;
        if(!i || !f) return alert("Selecione o período!");
        p = i.split('-').reverse().join('/') + " a " + f.split('-').reverse().join('/');
    }
    gerarEscala(p); fecharModalData();
}

function definirDataRapida(l) { gerarEscala(l); fecharModalData(); }

function gerarEscala(periodo) {
    const label = periodo === 'HOJE' ? new Date().toLocaleDateString() : periodo;
    const ativas = [...document.querySelectorAll("#tarefasHoje .ativo")].map(e=>e.innerText);
    let dist = {};
    
    ativas.forEach(t => {
        config[t].responsaveis.forEach(r => {
            if(!dist[r.pessoa]) dist[r.pessoa] = [];
            dist[r.pessoa].push(r.obs ? `${t} (${r.obs})` : t);
        });
    });
    
    historico.unshift({ data: label, distribuicao: dist });
    document.getElementById("tituloEscalaGerada").innerText = "ESCALA: " + label;
    document.getElementById("resultado").innerHTML = Object.entries(dist).map(([p, tasks]) => 
        `<div style="padding:8px; border-bottom:1px solid #eee;"><b>${p}</b>: ${tasks.join(" | ")}</div>`).join("");
    document.getElementById("resultSection").classList.remove("hidden");
    salvarTudo();
}
function abrirDemandasConcluidas() {
    renderDemandasConcluidas();
    document.getElementById("modalDemandasConcluidas").style.display = "block";
}

function fecharDemandasConcluidas() {
    document.getElementById("modalDemandasConcluidas").style.display = "none";
}
function toggleDemandas() {
    demandasMinimizadas = !demandasMinimizadas;
    renderDemandas();
}

// --- DEMANDAS (COM BOTÃO LIXEIRA) ---
function renderDemandas() {
const container = document.getElementById("listaDemandas");
    if (!container) return;
const titulo = document.getElementById("tituloDemandas");
const contador = document.getElementById("contadorDemandas");
const seta = document.getElementById("setaDemandas");

const visiveis = demandas.filter(d => !d.concluida).length;

contador.innerText = demandasMinimizadas ? ` (${visiveis})` : "";
seta.innerText = demandasMinimizadas ? "▶" : "▼";

if (demandasMinimizadas) {
    container.innerHTML = "";
    return;
}

    
    container.innerHTML = "";
    
    demandas.forEach((d, i) => {
    if (d.concluida) return;

// GARANTIR ESTRUTURA MÍNIMA (anti-bug)
if (!Array.isArray(d.responsaveis)) d.responsaveis = [];
if (!Array.isArray(d.unidades)) d.unidades = [];

        const div = document.createElement('div');
        div.className = "demand-card";
        div.style.borderLeft = `8px solid ${getCorPrio(d.prioridade)}`;
        
        if (d.editando) {
    div.innerHTML = `
<!-- BOTÃO MINIMIZAR -->
        <div style="display:flex; justify-content:flex-end; margin-bottom:8px;">
            <button class="btn-reset"
                    onclick="alternarDemanda(${i})"
                    title="Minimizar">
                ➖
            </button>
        </div>
     <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
    <input
        placeholder="Título da Demanda"
        value="${d.titulo || ''}"
        oninput="demandas[${i}].titulo = this.value"
        style="padding:8px; border:1px solid #ddd; border-radius:4px;"
    >

    <input
        placeholder="Subtítulo"
        value="${d.subtitulo || ''}"
        oninput="demandas[${i}].subtitulo = this.value"
        style="padding:8px; border:1px solid #ddd; border-radius:4px;"
    >
</div>

<div style="margin-bottom:10px;">
    <input
        placeholder="Status da demanda (ex: Em andamento, Finalizada...)"
        value="${d.status || ''}"
        oninput="demandas[${i}].status = this.value"
        style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;"
    >
</div>
   
<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
            <div>
                <small>Início:</small><br>
                <input type="date"
                       value="${d.dataIni || ''}"
                       oninput="demandas[${i}].dataIni = this.value"
                       style="width:100%; padding:5px;">
            </div>

            <div>
                <small>Fim:</small><br>
                <input type="date"
                       value="${d.dataFim || ''}"
                       oninput="demandas[${i}].dataFim = this.value"
                       style="width:100%; padding:5px;">
            </div>

            <div>
                <small>Prioridade:</small><br>
                <select onchange="demandas[${i}].prioridade = this.value"
                        style="width:100%; padding:6px;">
                    <option ${d.prioridade==='Baixa'?'selected':''}>Baixa</option>
                    <option ${d.prioridade==='Normal'?'selected':''}>Normal</option>
                    <option ${d.prioridade==='Alta'?'selected':''}>Alta</option>
                    <option ${d.prioridade==='Urgente'?'selected':''}>Urgente</option>
                </select>
            </div>
        </div>

        <div id="editor_${d.id}"
             style="height:150px; background:white; margin-bottom:10px;"></div>

        <div style="background:#f1f5f9; padding:10px; border-radius:6px; margin-bottom:10px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <b>Equipe:</b>
        <button class="btn-reset" onclick="abrirSorteioDemanda(${i})">🎲 Sortear</button>
    </div>

    <div class="chip-container">
        ${membros.map(m => {
            const r = d.responsaveis.find(x=>x.pessoa===m);
            return `<div class="presente-toggle ${r?'ativo':''}"
                         onclick="toggleRespDemanda(${i},'${m}', this)">
                         ${m}
                    </div>`;
        }).join("")}
    </div>
</div>


        <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:10px;">
            <b>Unidade de Trabalho:</b>
            <div class="chip-container">
                ${UNIDADES_TRABALHO.map(u => `
                    <div class="presente-toggle ${d.unidades.includes(u)?'ativo':''}"
                         onclick="toggleUnidadeDemanda(${i},'${u}', this)">${u}</div>
                `).join("")}
            </div>
        </div>

        <div style="display:flex; gap:10px;">
            <button class="btn-accent" onclick="gravarDemanda(${i})">✅ GRAVAR</button>
            <button class="btn-reset" onclick="removerDemanda(${i})" style="color:red">Excluir</button>
        </div>
    `;

    setTimeout(() => {
        const q = new Quill(`#editor_${d.id}`, { theme: 'snow' });
        q.root.innerHTML = d.notas || '';
        q.on('text-change', () => d.notas = q.root.innerHTML);
    }, 10);





      } else {
    const datas = (d.dataIni && d.dataFim)
        ? `${d.dataIni.split('-').reverse().join('/')} a ${d.dataFim.split('-').reverse().join('/')}`
        : "Sem data";

    div.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">

            <!-- PRIORIDADE -->
            <span style="
                background:${getCorPrio(d.prioridade)};
                color:white;
                padding:4px 6px;
                border-radius:4px;
                font-size:0.7rem;
                font-weight:bold;
                min-width:60px;
                text-align:center;
            ">
                ${(d.prioridade || 'NORMAL').toUpperCase()}
            </span>

            <!-- CONTEÚDO CENTRAL -->
            <div style="flex:1">
                <b>${d.titulo || 'Sem Título'}</b>
                <div style="font-size:0.75rem; color:#666;">
                    ${d.subtitulo || ''}
                </div>
                <div style="font-size:0.75rem; color:#888;">
                    📅 ${datas} | 👤 ${d.responsaveis.map(r=>r.pessoa).join(", ")}
                </div>
            </div>

            <!-- AÇÕES -->
            <div style="display:flex; gap:6px; align-items:center;">

    <button class="btn-reset"
        onclick="alternarDemanda(${i})"
        title="Expandir demanda">
        ➕
    </button>

    <button class="btn-reset"
        onclick="transformarDemandaEmTarefa(${i})"
        title="Enviar demanda para tarefas">
        🔁
    </button>

    <button class="btn-reset"
        onclick="exportarUnicaDemanda(${i},'print')"
        title="Imprimir demanda">
        🖨️
    </button>

    <button class="btn-reset"
        onclick="exportarUnicaDemanda(${i},'word')"
        title="Exportar demanda para Word">
        📄
    </button>

    <button class="btn-reset"
        onclick="exportarUnicaDemanda(${i},'whats')"
        title="Enviar demanda por WhatsApp">
        📲
    </button>

    <button class="btn-reset"
        style="color:#ef4444"
        onclick="removerDemanda(${i})"
        title="Excluir demanda">
        🗑️
    </button>

</div>

        </div>

        <div style="margin-top:6px; font-size:0.8rem;">
            <label>
                <input type="checkbox"
                    ${d.concluida?'checked':''}
                    onclick="marcarDemandaConcluida(${i})">
                Demanda Concluída
            </label>
        </div>
    `;





                
        }
        container.appendChild(div);
    });
}

function gravarDemanda(i) {
    const d = demandas[i];

    d.editando = false;

    salvarTudo();
    renderDemandas();

    fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            tipo: "demanda",
            id: d.id,
            titulo: d.titulo,
            subtitulo: d.subtitulo || "",
            status: d.status || "",
            prioridade: d.prioridade || "Normal",
            data_inicio: d.dataIni || "",
            data_fim: d.dataFim || "",
            dados: JSON.stringify(d)
        })
    });
}




function novaDemanda() {
    const id = "d" + Date.now();

    // FECHA TODAS AS OUTRAS
    demandas.forEach(d => d.editando = false);

    demandas.unshift({
        id: id,
        titulo: "",
        subtitulo: "",
        status: "",
        prioridade: "Normal",
        dataIni: "",
        dataFim: "",
        notas: "",
        responsaveis: [],
        unidades: [],
        editando: true,   // <<< ESSENCIAL
        concluida: false,
        selecionada: false
    });

    salvarTudo();
    renderDemandas();
}


function editarDemanda(i) { demandas.forEach(dem => dem.editando = false); demandas[i].editando = true; renderDemandas(); }

function alternarDemanda(i) {
    demandas[i].editando = !demandas[i].editando;
    salvarTudo();
    renderDemandas();
}

function marcarDemandaConcluida(i) {
    if (!demandas[i]) return;

    if (!confirm("Marcar esta demanda como concluída?")) {
        renderDemandas();
        return;
    }

    demandas[i].concluida = true;
    demandas[i].editando = false;

    salvarTudo();
    renderDemandas();
}


function removerDemanda(i) {
    if (!demandas[i]) return;

    if (confirm("Deseja realmente excluir esta demanda permanentemente?")) {
        demandas.splice(i, 1);
        salvarTudo();
        renderDemandas();
    }
}

// --- EXPORTAÇÕES ---
function executarExport(formato) {
    const h = historico[0];
    if(!h) return;
    if(formato === 'whats') {
        let m = `*COTEC - ESCALA*\n*DATA: ${h.data}*\n\n`;
        Object.entries(h.distribuicao).forEach(([p, t]) => m += `👤 *${p}*\n🛠 ${t.join(" | ")}\n\n`);
        window.open(`https://wa.me/?text=${encodeURIComponent(m)}`);
    } else {
        let html = `<html><body style="padding:40px; font-family:Arial;">${CABECALHO_SEM_IMAGEM(h.data)}
            <table border="1" style="width:100%; border-collapse:collapse">
                <tr style="background:#eee"><th style="padding:10px">Agente</th><th style="padding:10px">Atividades</th></tr>
                ${Object.entries(h.distribuicao).map(([p, t]) => `<tr><td style="padding:10px"><b>${p}</b></td><td style="padding:10px">${t.join(" | ")}</td></tr>`).join("")}
            </table></body></html>`;
        if(formato === 'print') { let w = window.open(""); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500); }
        else { const b = new Blob(['\ufeff', html], {type:'application/msword'}); const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = "Escala.doc"; l.click(); }
    }
}

function exportarUnicaDemanda(i, f) { exportarDemandasRelatorio([demandas[i]], f); }
function exportarDemandasLote(f) { 
    const s = demandas.filter(d=>d.selecionada);
    if(s.length === 0) return alert("Selecione os quadradinhos das demandas primeiro!");
    exportarDemandasRelatorio(s, f); 
}
function exportarDemandasRelatorio(lista, formato) {
    if (formato === 'whats') {
        const texto = lista.map(d => 
    `📌 *${d.titulo.toUpperCase()}*\n` +
    `🔹 ${d.subtitulo}\n` +
    `📌 Status: ${d.status || 'Não informado'}\n` +
    `📅 Período: ${d.dataIni.split('-').reverse().join('/')} a ${d.dataFim.split('-').reverse().join('/')}\n` +
    `👤 Equipe: ${d.responsaveis.map(r=>r.pessoa).join(", ")}\n` +
    `⚠️ Prioridade: ${d.prioridade}`
).join("\n\n------------------\n\n");
        
        window.open(`https://wa.me/?text=${encodeURIComponent("*RELATÓRIO DE DEMANDAS COTEC*\n\n" + texto)}`);
        return;
    }

    // Gerar o HTML completo para Impressão/Word
    let htmlContent = `
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .demanda-container { 
                border: 1px solid #ccc; 
                margin-bottom: 30px; 
                page-break-inside: avoid; 
                border-radius: 8px;
                overflow: hidden;
            }
            .demanda-header { 
                padding: 15px; 
                background: #f8fafc; 
                border-bottom: 2px solid #e2e8f0;
            }
            .prio-barra { height: 10px; width: 100%; }
            .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 10px; 
                padding: 10px 15px; 
                background: #fff; 
                font-size: 0.9rem;
                border-bottom: 1px dashed #eee;
            }
            .conteudo-notas { padding: 20px; background: white; }
            .label { font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 0.75rem; }
            h2 { margin: 0; color: #1e293b; font-size: 1.4rem; }
            h3 { margin: 5px 0 0 0; color: #475569; font-weight: 400; font-size: 1.1rem; }
            hr { border: 0; border-top: 1px solid #eee; }
        </style>
    </head>
    <body>
        ${CABECALHO_SEM_IMAGEM("RELATÓRIO DETALHADO DE DEMANDAS")}
        
        ${lista.map(d => `
            <div class="demanda-container">
                <div class="prio-barra" style="background-color: ${getCorPrio(d.prioridade)}"></div>
                <div class="demanda-header">
                    <span class="label">Título da Demanda</span>
                    <h2>${d.titulo || 'SEM TÍTULO'}</h2>
                    <h3>${d.subtitulo || ''}</h3>
                </div>
                
                <div class="info-grid">
                    <div>
                        <span class="label">Período:</span><br>
                        ${d.dataIni.split('-').reverse().join('/')} até ${d.dataFim.split('-').reverse().join('/')}
                    </div>
                    <div>
                        <span class="label">Prioridade:</span><br>
                        <span style="color: ${getCorPrio(d.prioridade)}; font-weight: bold;">${d.prioridade.toUpperCase()}</span>
                    </div>
                    <div style="grid-column: span 2;">
<div>
  <span class="label">Status:</span><br>
  ${d.status || 'Não informado'}
</div>

                        <span class="label">Equipe Responsável:</span><br>
                        ${d.responsaveis.map(r => r.pessoa).join(", ") || 'Nenhum agente alocado'}
                    </div>
                </div>

                <div class="conteudo-notas">
                    <span class="label">Detalhamento e Notas:</span>
                    <div style="margin-top: 10px;">
                        ${d.notas || '<i>Nenhum detalhamento inserido.</i>'}
                    </div>
                </div>
            </div>
        `).join("")}
    </body>
    </html>`;

    if (formato === 'print') {
        let w = window.open("");
        w.document.write(htmlContent);
        w.document.close();
        // Aguarda carregar possíveis estilos antes de imprimir
        setTimeout(() => w.print(), 500);
    } else {
        const b = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const l = document.createElement('a');
        l.href = URL.createObjectURL(b);
        l.download = `Relatorio_Demandas_${new Date().toLocaleDateString().replace(/\//g, '-')}.doc`;
        l.click();
    }
}

// --- MODAIS E SORTEIOS ---
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
    renderPainel(); fecharModal();
}
function toggleRespDemanda(idx, nome, el) {
    const d = demandas[idx];
    const rIdx = d.responsaveis.findIndex(x => x.pessoa === nome);

    if (rIdx > -1) {
        d.responsaveis.splice(rIdx, 1);
        el.classList.remove("ativo");
    } else {
        d.responsaveis.push({ pessoa: nome, tipo: 'P' });
        el.classList.add("ativo");
    }

    salvarTudo();
}


function abrirSorteioDemanda(i) {
    demandaSendoSorteada = i;

    const d = demandas[i];
    const elegiveis = membros.filter(m =>
        !d.responsaveis.some(r => r.pessoa === m)
    );

    document.getElementById("elegiveisDemandaContainer").innerHTML =
        elegiveis.map(m =>
            `<div class="presente-toggle ativo"
                  onclick="this.classList.toggle('ativo')">${m}</div>`
        ).join("");

    document.getElementById("qtdTotalDem").value = "";
    document.getElementById("modalSorteioDemanda").style.display = "block";
}

function confirmarSorteioDemanda() {
    const d = demandas[demandaSendoSorteada];

    const selecionados = [...document.querySelectorAll("#elegiveisDemandaContainer .ativo")]
        .map(e => e.innerText);

    const qtd = parseInt(document.getElementById("qtdTotalDem").value);

    if (!qtd || qtd < 1) {
        alert("Informe a quantidade a sortear.");
        return;
    }

    selecionados
        .sort(() => 0.5 - Math.random())
        .slice(0, qtd)
        .forEach(p => {
            d.responsaveis.push({ pessoa: p, tipo: "P", sorteado: true });
        });

    fecharModalDemanda();
    salvarTudo();
    renderDemandas();
}

function fecharModalDemanda() {
    document.getElementById("modalSorteioDemanda").style.display = "none";
}


function exportarDemandaParaTarefa(index) {
    const d = demandas[index];
    if (!d.titulo) {
        return alert("A demanda precisa de um título para ser exportada!");
    }

    const nomeTarefa = `${d.titulo.toUpperCase()} - DEMANDAS`;

    // Verifica se a tarefa já existe para não duplicar
    if (tarefas.includes(nomeTarefa)) {
        return alert("Esta demanda já foi exportada para a lista de tarefas!");
    }

    // Adiciona à lista de tarefas
    tarefas.push(nomeTarefa);
    
    // Inicializa a configuração da tarefa (responsaveis vazios)
    if (!config[nomeTarefa]) {
        config[nomeTarefa] = { responsaveis: [] };
    }

    // Salva e atualiza a interface
    salvarTudo();
    init(); // Recarrega as listas e o painel


    
    alert(`Tarefa "${nomeTarefa}" criada com sucesso!`);
}

// E adicione isso dentro da sua função init():
if (sessionStorage.getItem("avisoLido")) {
    document.getElementById("welcomeAlert").style.display = "none";
}

function addMembro() {
    const v = document.getElementById("novoMembro").value;
    if (!v) return;

    membros.push(v);
    document.getElementById("novoMembro").value = "";
    renderListas();
    salvarTudo();

    fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            tipo: "membro",
            nome: v
        })
    });
}

function addTarefa() {
    const v = document.getElementById("novaTarefa").value;
    if (!v) return;

    tarefas.push(v);
    document.getElementById("novaTarefa").value = "";
    init();
    salvarTudo();

    fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            tipo: "tarefa",
            nome: v
        })
    });
}


function removerMembro(i) { membros.splice(i,1); renderListas(); salvarTudo(); }
function removerTarefa(i) { tarefas.splice(i,1); renderListas(); salvarTudo(); }

// ===============================
// DEMANDAS CONCLUÍDAS
// ===============================

function abrirDemandaConcluida(index) {
    // fecha todas
    demandas.forEach(d => d.editando = false);

    // tira da lista de concluídas
    demandas[index].concluida = false;

    // abre em modo edição
    demandas[index].editando = true;

    salvarTudo();
    fecharDemandasConcluidas();
    renderDemandas();
}


function fecharDemandasConcluidas() {
    const modal = document.getElementById("modalDemandasConcluidas");
    modal.style.display = "none";
}


function visualizarDemandaConcluida(i) {
    // fecha todas
    demandas.forEach(d => d.editando = false);

    // reabre esta
    demandas[i].editando = true;

    fecharDemandasConcluidas();
    salvarTudo();
    renderDemandas();
}

function restaurarDemanda(i) {
    demandas[i].concluida = false;
    demandas[i].editando = false;

    salvarTudo();
    renderDemandas();
    renderDemandasConcluidas();
}

function excluirDemandaConcluida(i) {
    if (!confirm("Excluir esta demanda definitivamente?")) return;

    demandas.splice(i, 1);

    salvarTudo();
    renderDemandas();
    renderDemandasConcluidas();
}
// ===============================
// PROJETOS
// ===============================
function corProgresso(p) {
    if (p >= 80) return "#16a34a"; // verde
    if (p >= 50) return "#facc15"; // amarelo
    if (p >= 20) return "#f97316"; // laranja
    return "#dc2626";              // vermelho
}




// ===============================
// REUNIÕES
// ===============================

function novaReuniao() {
    // fecha qualquer outra aberta
    reunioes.forEach(r => r.editando = false);

    reunioes.unshift({
    id: "r" + Date.now(),
    titulo: "",
    subtitulo: "",
    data: "",
    semData: false, // <<< ESTA LINHA
    convocador: "",
    participantes: {
        modo: "manual",
        equipe: [],
        convidados: []
    },
    pautas: [],
textoLivre: "",   
 editando: true
    });

    salvarTudo();
    renderReunioes();
}


function alternarReuniao(i) {
    const abrir = !reunioes[i].editando;

    reunioes.forEach(r => r.editando = false);
    reunioes[i].editando = abrir;

    salvarTudo();
    renderReunioes();
}

function toggleReunioes() {
    reunioesMinimizadas = !reunioesMinimizadas;
    renderReunioes();
}

function renderReunioes(render) {
const c = document.getElementById("listaReunioes");
    if (!c) return;
const contador = document.getElementById("contadorReunioes");
const seta = document.getElementById("setaReunioes");

contador.innerText = reunioesMinimizadas ? ` (${reunioes.length})` : "";
seta.innerText = reunioesMinimizadas ? "▶" : "▼";

if (reunioesMinimizadas) {
    c.innerHTML = "";
    return;
}

    

    c.innerHTML = "";

    reunioes.forEach((r, i) => {
        const div = document.createElement("div");
        div.className = "demand-card";

        if (r.editando) {
            div.innerHTML = `
                <div style="display:flex; justify-content:flex-end">
                    <button class="btn-reset" onclick="alternarReuniao(${i})">➖</button>
                </div>

                <input
                    placeholder="Título da Reunião"
                    value="${r.titulo}"
                    onchange="reunioes[${i}].titulo=this.value"
                    style="font-size:1.1rem;font-weight:bold;width:100%;margin-bottom:8px"
                >

                <input
                    placeholder="Subtítulo"
                    value="${r.subtitulo}"
                    onchange="reunioes[${i}].subtitulo=this.value"
                    style="width:100%;margin-bottom:8px"
                >

                <div style="display:flex;gap:10px;margin-bottom:10px">
                    <input type="date"
                        value="${r.data || ''}"
                        onchange="reunioes[${i}].data=this.value">

                    <label style="font-size:0.85rem">
                        <label style="font-size:0.85rem">
    <input type="checkbox"
        ${r.semData ? 'checked' : ''}
        onchange="
            reunioes[${i}].semData = this.checked;
            if (this.checked) {
                reunioes[${i}].data = '';
            }
            salvarTudo();
            renderReunioes();
        ">
    Sem data definida
</label>

                    </label>
                </div>

                <input
                    placeholder="Convocador"
                    value="${r.convocador}"
                    onchange="reunioes[${i}].convocador=this.value"
                    style="width:100%;margin-bottom:10px"
                >

                <hr>

                <b>Participantes</b>
                <div style="display:flex;gap:10px;margin:8px 0">
                    <button onclick="setModoParticipantes(${i},'manual')">Selecionar</button>
                    <button onclick="setModoParticipantes(${i},'equipe')">Toda a Equipe</button>
                    <button onclick="setModoParticipantes(${i},'presentes')">Presentes</button>
                </div>

                <div id="participantes_${i}"></div>
                <button onclick="addConvidado(${i})">+ Convidado</button>

                <hr>

                <b>Pautas</b>
                <div id="pautas_${i}"></div>
                <button onclick="addPauta(${i})">+ Pauta</button>
<hr>

<b>Texto Livre / Observações</b>

<textarea
    rows="6"
    placeholder="Digite aqui observações gerais, decisões, encaminhamentos..."
    style="width:100%; resize:vertical"
    onchange="reunioes[${i}].textoLivre = this.value"
>${r.textoLivre || ""}</textarea>

                <hr>

                <div style="display:flex;gap:10px">
                    <button class="btn-accent" onclick="alternarReuniao(${i})">Salvar</button>
                    <button onclick="exportarReuniao(${i},'print')">Imprimir</button>
                    <button onclick="exportarReuniao(${i},'word')">Word</button>
                    <button onclick="exportarReuniao(${i},'whats')">WhatsApp</button>
                </div>
            `;

            renderParticipantes(i);
            renderPautas(i);div.inner



        } else {
            div.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <b>${r.titulo || "REUNIÃO"}</b><br>
                        <span style="color:#666">${r.subtitulo || ""}</span><br>
                        <small style="color:#888">
                            📅 ${r.data ? r.data.split('-').reverse().join('/') : "Sem data definida"}
                        </small>
                    </div>

                    <div style="display:flex;gap:6px">
                        <button class="btn-reset" onclick="alternarReuniao(${i})">➕</button>
                        <button class="btn-reset" style="color:#ef4444" onclick="excluirReuniao(${i})">🗑️</button>
                    </div>
                </div>
            `;
        }

        c.appendChild(div);
    });
}


       

function salvarReuniao(i) {
    reunioes[i].editando = false;
    salvarTudo();
    renderReunioes();
}

function editarReuniao(i) {
    reunioes.forEach(r => r.editando = false);
    reunioes[i].editando = true;
    renderReunioes();
}

function excluirReuniao(i) {
    if (confirm("Excluir esta reunião?")) {
        reunioes.splice(i, 1);
        salvarTudo();
        renderReunioes();
    }
}
function setModoParticipantes(i, modo) {
    const r = reunioes[i];
    r.participantes.modo = modo;

    if (modo === "equipe") {
        r.participantes.equipe = [...membros];
    }

    if (modo === "presentes") {
        r.participantes.equipe = [...document.querySelectorAll("#presentes .ativo")]
            .map(e => e.innerText);
    }

    renderParticipantes(i);
}

function renderParticipantes(i) {
    const r = reunioes[i];
    const div = document.getElementById(`participantes_${i}`);
    if (!div) return;

    let html = "";

    if (r.participantes.modo === "manual") {
        html = membros.map(m =>
            `<label style="display:block">
                <input type="checkbox"
                    ${r.participantes.equipe.includes(m) ? "checked" : ""}
                    onchange="toggleParticipante(${i},'${m}')">
                ${m}
            </label>`
        ).join("");
    } else {
        html = r.participantes.equipe.join(", ");
    }

    if (r.participantes.convidados.length) {
        html += `<br><i>Convidados:</i> ${r.participantes.convidados.join(", ")}`;
    }

    div.innerHTML = html;
}

function toggleParticipante(i, nome) {
    const l = reunioes[i].participantes.equipe;
    const idx = l.indexOf(nome);
    if (idx > -1) l.splice(idx, 1);
    else l.push(nome);
}
function addConvidado(i) {
    const nome = prompt("Nome do convidado:");
    if (nome) {
        reunioes[i].participantes.convidados.push(nome);
        renderParticipantes(i);
    }
}

function addPauta(i) {
    reunioes[i].pautas.push({ tema: "", comentario: "" });
    renderPautas(i);
}

function renderPautas(i) {
    const div = document.getElementById(`pautas_${i}`);
    if (!div) return;

    div.innerHTML = reunioes[i].pautas.map((p, idx) => `
        <div style="margin-bottom:8px">
            <input placeholder="Pauta"
                   value="${p.tema}"
                   onchange="reunioes[${i}].pautas[${idx}].tema=this.value">
            <textarea placeholder="Comentário da pauta"
          rows="3"
          style="width:100%; resize:vertical"
          onchange="reunioes[${i}].pautas[${idx}].comentario=this.value">${p.comentario}</textarea>

        </div>
    `).join("");
}
function exportarReuniao(i, formato) {
    const r = reunioes[i];

    const participantes = [
        ...r.participantes.equipe,
        ...r.participantes.convidados
    ].join(", ");

    if (formato === "whats") {
        let txt =
`*REUNIÃO*
*${r.titulo}*
_${r.subtitulo}_

👤 Convocador: ${r.convocador}
👥 Participantes: ${participantes}

📌 Pautas:
${r.pautas.map((p, idx) => `${idx+1}. ${p.tema} — ${p.comentario}`).join("\n")}

${r.textoLivre ? `\n📝 *Observações Gerais:*\n${r.textoLivre}` : ""}`;


        window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`);
        return;
    }

    const html = `
    <html><body style="font-family:Arial; padding:40px">
    ${CABECALHO_SEM_IMAGEM("REUNIÃO")}
    <h2>${r.titulo}</h2>
    <h4>${r.subtitulo}</h4>
    <p><b>Convocador:</b> ${r.convocador}</p>
    <p><b>Participantes:</b> ${participantes}</p>
    <hr>
    ${r.textoLivre ? `
<hr>
<h3>Observações Gerais</h3>
<div style="white-space:pre-wrap; margin-top:10px;">
    ${r.textoLivre}
</div>
` : ""}

<hr>
<h3>Pautas</h3>
<ol>
    ${r.pautas.map(p => `
        <li>
            <b>${p.tema}</b><br>
            ${p.comentario}
        </li>
    `).join("")}
</ol>

    </body></html>
    `;

    if (formato === "print") {
        const w = window.open("");
        w.document.write(html);
        w.document.close();
        setTimeout(()=>w.print(),500);
    } else {
        const b = new Blob(['\ufeff', html], {type:'application/msword'});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = "Reuniao.doc";
        a.click();
    }
}
function transformarDemandaEmTarefa(i) {
    const d = demandas[i];
    if (!d || !d.titulo) {
        alert("A demanda precisa de um título.");
        return;
    }

    const nome = `${d.titulo.toUpperCase()} (VER DEMANDAS)`;

    if (tarefas.includes(nome)) {
        alert("Essa demanda já virou tarefa.");
        return;
    }

    tarefas.push(nome);
    if (!config[nome]) {
        config[nome] = { responsaveis: [] };
    }

    salvarTudo();
    renderListas();
    alert("Demanda enviada para a Escala.");
}
function renderDemandasConcluidas() {
    const c = document.getElementById("listaDemandasConcluidas");
    if (!c) return;

    const concluidas = demandas.filter(d => d.concluida);

    if (concluidas.length === 0) {
        c.innerHTML = "<i>Nenhuma demanda concluída.</i>";
        return;
    }

    c.innerHTML = concluidas.map((d, i) => `
        <div class="demand-card" style="margin-bottom:10px">
            <b>${d.titulo || "Sem título"}</b>
            <div style="font-size:0.8rem;color:#666">
                ${d.subtitulo || ""}
            </div>

            <div style="margin-top:6px; display:flex; gap:6px">
                <button class="btn-reset"
                    onclick="reabrirDemanda('${d.id}')">↩️ Voltar</button>

                <button class="btn-reset"
                    onclick="excluirDemandaConcluida('${d.id}')"
                    style="color:#ef4444">🗑️ Excluir</button>
            </div>
        </div>
    `).join("");
}
function reabrirDemanda(id) {
    const d = demandas.find(x => x.id === id);
    if (!d) return;

    d.concluida = false;
    d.editando = true;

    salvarTudo();
    fecharDemandasConcluidas();
    renderDemandas();
}

function excluirDemandaConcluida(id) {
    if (!confirm("Excluir definitivamente esta demanda?")) return;

    const idx = demandas.findIndex(x => x.id === id);
    if (idx > -1) demandas.splice(idx, 1);

    salvarTudo();
    renderDemandasConcluidas();
}


function toggleUnidadeDemanda(i, unidade, el) {
    const d = demandas[i];
    if (!Array.isArray(d.unidades)) d.unidades = [];

    const idx = d.unidades.indexOf(unidade);
    if (idx > -1) {
        d.unidades.splice(idx, 1);
        el.classList.remove("ativo");
    } else {
        d.unidades.push(unidade);
        el.classList.add("ativo");
    }

    salvarTudo();
}

async function carregarDadosDoServidor() {
    try {
        const r = await fetch(API_URL);
        const dados = await r.json();

        membros   = dados.membros   || [];
        tarefas   = dados.tarefas   || [];
        demandas  = dados.demandas  || [];
        reunioes  = dados.reunioes  || [];
        config    = dados.config    || {};
        historico = dados.historico || [];

        init();
    } catch (e) {
        console.error("Erro ao carregar dados do servidor", e);
        // fallback local (se quiser)
        init();
    }
}

carregarDadosDoServidor();

// ===============================
// PROJETOS
// ===============================

function novoProjeto() {
    const novo = {
        id: "p" + Date.now(),
        interessados: [],
        titulo: "",
        periodo: "",
        progresso: 0,
        descricao: ""
    };

    // adiciona no TOPO da lista
    projetos.unshift(novo);

    salvarTudo();
    renderProjetos();

    // NÃO abre modal
    // usuário decide se quer clicar no ➕ depois
}



function filtrarProjetosPorProgresso(valor) {
    filtroProgressoProjetos = valor;
    renderProjetos();
}


function renderProjetos() {
    const c = document.getElementById("listaProjetos");
    if (!c) return;

    const contador = document.getElementById("contadorProjetos");
    const seta = document.getElementById("setaProjetos");

    contador.innerText = projetosMinimizados ? ` (${projetos.length})` : "";
    seta.innerText = projetosMinimizados ? "▶" : "▼";

    if (projetosMinimizados) {
        c.innerHTML = "";
        return;
    }

    c.innerHTML = "";
    let lista = projetos.slice();

// filtro por progresso
if (filtroProgressoProjetos !== "todos") {
    const partes = filtroProgressoProjetos.split("-");
    const min = Number(partes[0]);
    const max = Number(partes[1]);

    lista = lista.filter(p => {
        const prog = Number(p.progresso || 0);
        return prog >= min && prog <= max;
    });
}

// ordena por progresso (maior primeiro)


// renderiza
lista.forEach(p => {
    const i = projetos.findIndex(x => x.id === p.id);





            const div = document.createElement("div");
            div.className = "demand-card";

            div.innerHTML = `
<div style="display:flex; flex-direction:column; gap:10px">

    <!-- INTERESSADOS -->
    <div class="chip-container">
        ${["DEPOL","COTEC","IDENTIFICAÇÃO FUNCIONAL","IDENTIFICAÇÃO DE VISITANTES","CREDENCIAMENTO DE VEÍCULOS"]
            .map(x => `
                <div class="presente-toggle ${Array.isArray(p.interessados) && p.interessados.includes(x)
 ? 'ativo' : ''}"
                     onclick="toggleInteressadoProjeto(${i}, '${x}', this)">
                    ${x}
                </div>
            `).join("")}
    </div>

    <!-- LINHA PRINCIPAL -->
    <div style="display:flex; gap:10px; align-items:center">

        <input style="flex:1"
            placeholder="Título do projeto"
            value="${p.titulo || ''}"
            onchange="projetos[${i}].titulo=this.value; salvarTudo()">

        <input style="width:140px"
            placeholder="Período"
            value="${p.periodo || ''}"
            onchange="projetos[${i}].periodo=this.value; salvarTudo()">

        <input type="number" min="0" max="100" style="width:60px"
    value="${(p.progresso !== undefined && p.progresso !== null ? p.progresso : 0)
}"
    onchange="
        projetos[${i}].progresso = Number(this.value || 0);
        salvarTudo();
        renderProjetos();
    ">


        <!-- BARRA FAKE -->
        <div style="width:120px; background:#e5e7eb; height:8px; border-radius:4px">
            <div style="
                width:${p.progresso || 0}%;
                height:8px;
                background:${corProgresso(p.progresso || 0)};
                border-radius:4px">
            </div>
        </div>

        <button class="btn-reset" title="Descrição do projeto"
            onclick="abrirDescricaoProjeto(${i})">➕</button>

        <button class="btn-reset" title="Imprimir"
            onclick="exportarProjeto(${i},'print')">🖨️</button>

        <button class="btn-reset" title="Word"
            onclick="exportarProjeto(${i},'word')">📄</button>

        <button class="btn-reset" title="WhatsApp"
            onclick="exportarProjeto(${i},'whats')">📲</button>

        <button class="btn-reset" title="Excluir"
            style="color:#ef4444"
            onclick="excluirProjeto(${i})">🗑️</button>

    </div>
</div>
`;
            c.appendChild(div);
        });
}

function excluirProjeto(i) {
    if (!confirm("Excluir este projeto?")) return;
    projetos.splice(i,1);
    salvarTudo();
    renderProjetos();
}
function toggleInteressadoProjeto(i, nome, el) {
    if (!Array.isArray(projetos[i].interessados)) {
        projetos[i].interessados = [];
    }

    const idx = projetos[i].interessados.indexOf(nome);

    if (idx > -1) {
        projetos[i].interessados.splice(idx, 1);
        el.classList.remove("ativo");
    } else {
        projetos[i].interessados.push(nome);
        el.classList.add("ativo");
    }

    salvarTudo();
}
function toggleProjetos() {
    projetosMinimizados = !projetosMinimizados;
    renderProjetos();
}


function exportarProjeto(i, formato) {
    const p = projetos[i];

    const textoWhats =
`📌 *PROJETO*
🏷️ *${p.titulo || 'Sem título'}*
👥 Interessado: ${Array.isArray(p.interessados) ? p.interessados.join(", ") : "-"
}

📅 Período: ${p.periodo || '-'}

📊 Progresso: ${p.progresso || 0}%

📝 *Descrição:*
${p.descricao ? p.descricao.replace(/<[^>]+>/g, '') : 'Sem descrição.'}`;

    if (formato === "whats") {
        window.open(
            `https://wa.me/?text=${encodeURIComponent(textoWhats)}`
        );
        return;
    }

    const html = `
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="font-family:Arial; padding:40px">
    ${CABECALHO_SEM_IMAGEM("PROJETO")}


    <h2>${p.titulo || "Sem título"}</h2>

    <p><b>Interessado:</b> ${Array.isArray(p.interessados) ? p.interessados.join(", ") : "-"
}
</p>
    <p><b>Período:</b> ${p.periodo || "-"}</p>
    <p><b>Progresso:</b> ${p.progresso || 0}%</p>

    <hr>

    <h3>Descrição do Projeto</h3>
    <div style="margin-top:10px">
        ${p.descricao || "<i>Sem descrição.</i>"}
    </div>

</body>
</html>
`;

    if (formato === "print") {
        const w = window.open("");
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
    } else {
        const blob = new Blob(
            ['\ufeff', html],
            { type: 'application/msword' }
        );
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `Projeto_${(p.titulo || 'Projeto').replace(/\s+/g,'_')}.doc`;
        a.click();
    }
}

function gravarDescricaoProjeto() {
    if (projetoAtualIndex === null) {
        alert("Nenhum projeto selecionado.");
        return;
    }

    projetos[projetoAtualIndex].descricao =
        quillProjeto.root.innerHTML;

    salvarTudo();
    fecharModalProjeto();
    renderProjetos();
}


function fecharModalProjeto() {
    const modal = document.getElementById("modalProjeto");
    modal.style.display = "none";
}

