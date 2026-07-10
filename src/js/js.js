let dadosAntigos = {};
let dadosNovos = {};

let totalAumento = 0;
let totalReducao = 0;
let qtdAumento = 0;
let qtdReducao = 0;

let timeCompararId;
let timeLoadId;

//Quando o HTML tiver carregado, apareça o Spinner, e com 1.3s some o Spinner.
document.addEventListener('DOMContentLoaded', () => {
    const loadSpin = document.getElementById("loadSpin");
    
    if (!loadSpin) return;
    
    loadSpin.classList.remove('active');
    
    clearTimeout(timeLoadId);
    
    timeLoadId = setTimeout(() => {
        loadSpin.classList.add("active");
    }, 1300)
})

// LEITURA DE ARQUIVOS
function lerArquivo(file, callback) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsText(file);
}


// FORMATAÇÃO DINHEIRO
function dinheiroBR(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


// ALERTA + SOM
function tocarSomOk() {
    const som = document.getElementById("somOk");
    if (som) {
        som.currentTime = 0;
        som.play();
    }
}

function tocarSomErro() {
    const som = document.getElementById("somErro");
    if (som) {
        som.currentTime = 0;
        som.play();
    }
}

function mostrarAlerta(mensagem, tipo = "erro") {
    const alerta = document.getElementById("alerta");
    if (alerta.timer) clearTimeout(alerta.timer);
    
    alerta.textContent = mensagem;
    alerta.classList.remove("erro", "sucesso", "mostrar");
    alerta.classList.add(tipo, "mostrar");
    
    if (tipo === "sucesso") tocarSomOk();
    else tocarSomErro();
    
    alerta.timer = setTimeout(() => {
        alerta.classList.remove("mostrar");
    }, 3000);
}


// EXTRAÇÃO DE DADOS (AJUSTADO SALDO)
function extrairDados(texto) {
    const linhas = texto.split("\n");
    const produtos = {};
    
    linhas.forEach(linha => {
        if (!linha.includes("*")) return;
        
        linha = linha.replace(/\r/g, "").replace(/\t/g, " ").trim();
        linha = linha.replace("*", "").trim();
        
        const nceMatch = linha.match(/\b\d{5,}\b/);
        if (!nceMatch) return;
        const nce = nceMatch[0];
        
        const precoMatch = linha.match(/([\d.,]+)\s*$/);
        if (!precoMatch) return;
        
        const preco = parseFloat(precoMatch[1].replace(",", ""));
        if (isNaN(preco)) return;
        
        linha = linha.replace(/([\d.,]+)\s*$/, "").trim();
        
        // SALDO NUMÉRICO
        let saldo = 0;
        const saldoMatch = linha.match(/\b\d+\.\d{2}\b/);
        if (saldoMatch) {
            saldo = parseFloat(saldoMatch[0]);
            linha = linha.replace(saldoMatch[0], "").trim();
        }
        
        linha = linha.replace(nce, "").trim();
        linha = linha.replace(/^\d+\s*/, "");
        linha = linha.replace(/^\d+\s*/, "");
        
        let cor = "";
        let descricao = linha;
        
        const palavras = linha.split(" ");
        let palavrasCor = [];
        let i = 0;
        
        while (i < palavras.length && /^[A-ZÀ-Ú\/]+$/.test(palavras[i])) {
            palavrasCor.push(palavras[i]);
            i++;
        }
        
        if (palavrasCor.length > 0) {
            cor = palavrasCor.join(" ");
            descricao = palavras.slice(i).join(" ");
        }
        
        descricao = descricao
            .replace(new RegExp(`\\b${cor}\\b`, "gi"), "")
            .replace(/\b\d+\b/g, "")
            .replace(/[\/\-.,;]+$/g, "")
            .replace(/[^a-zA-ZÀ-ÿ0-9\s\-\/]/g, "")
            .replace(/\s{2,}/g, " ")
            .trim();
        
        produtos[nce] = {
            nce,
            cor,
            descricao,
            saldo,
            preco
        };
    });
    
    return produtos;
}


// COMPARAR AS TABELAS
function comparar() {
    const oldFile = document.getElementById("oldFile").files[0];
    const newFile = document.getElementById("newFile").files[0];
    
    if (!oldFile || !newFile) {
        mostrarAlerta("Selecione os dois arquivos!");
        return;
    }
    
    clearTimeout(timeCompararId);
    
    limparTudo();
    btnBar();
    
    document.getElementById("spin").classList.remove("hidden");
    
    timeCompararId = setTimeout(() => {
        document.getElementById("spin").classList.add("hidden");
        lerArquivo(oldFile, textoAntigo => {
            dadosAntigos = extrairDados(textoAntigo);
            
            lerArquivo(newFile, textoNovo => {
                dadosNovos = extrairDados(textoNovo);
                mostrarResultado();
            });
        })
    }, 1700);
}


// FILTRO
function filtrarTabela() {
    const termo = document.getElementById("busca").value.toLowerCase();
    const linhas = document.querySelectorAll("#resultado tbody tr");
    
    linhas.forEach(tr => {
        const texto = tr.innerText.toLowerCase();
        tr.style.display = texto.includes(termo) ? "" : "none";
    });
}


// RESULTADO COM ENTRADA NO ESTOQUE
function mostrarResultado() {
    totalAumento = 0;
    totalReducao = 0;
    qtdAumento = 0;
    qtdReducao = 0;
    
    const tbody = document.querySelector("#resultado tbody");
    tbody.innerHTML = "";
    
    const lista = Object.values(dadosNovos);
    lista.sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
    
    lista.forEach(produto => {
        const nce = produto.nce;
        
        if (dadosAntigos[nce]) {
            const antigo = dadosAntigos[nce].preco;
            const novo = produto.preco;
            
            const saldoAntigo = parseFloat(dadosAntigos[nce].saldo) || 0;
            const saldoNovo = parseFloat(produto.saldo) || 0;
            
            const diferencaSaldo = saldoNovo - saldoAntigo;
            const entrouSaldo = diferencaSaldo > 0;
            
            // AGORA NÃO IGNORA SE ENTROU SALDO
            if (antigo === novo && !entrouSaldo) return;
            
            const diferenca = novo - antigo;
            const valorFormatado = Math.abs(diferenca).toLocaleString("pt-BR", {
                minimumFractionDigits: 2
            });
            
            const diferencaTexto =
                diferenca > 0 ? `R$ +${valorFormatado}` : `R$ -${valorFormatado}`;
            
            if (diferenca > 0) {
                qtdAumento++;
                totalAumento += diferenca;
            } else if (diferenca < 0) {
                qtdReducao++;
                totalReducao += diferenca;
            }
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${nce}</td>
            <td>${produto.cor || "-"}</td>
            <td>${produto.descricao}</td>
            <td>${saldoNovo}</td>
            <td>${dinheiroBR(antigo)}</td>
            <td>${dinheiroBR(novo)}</td>
            <td class="${diferenca > 0 ? 'positivo' : diferenca < 0 ? 'negativo' : ''}">${diferenca !== 0 ? diferencaTexto : '-'}</td>
            <td class="${entrouSaldo ? 'entrada' : ''}">
                ${entrouSaldo ? '+' + diferencaSaldo : '-'}
            </td>
            `;
            tbody.appendChild(tr);
            
        } else {
            const saldoNovo = parseFloat(produto.saldo) || 0;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${nce}</td>
            <td>${produto.cor || "-"}</td>
            <td>${produto.descricao}</td>
            <td>${saldoNovo}</td>
            <td style="color:blue;font-weight:bold;">NOVO</td>
            <td>${dinheiroBR(produto.preco)}</td>
            <td>-</td>
            <td class="entrada">+${saldoNovo}</td>
            `;
            tbody.appendChild(tr);
        }
        
        destacarAumentosVisualmente();
    });
    
    /*document.getElementById("resumo").innerHTML = `
    <b class="total-alterados">Produtos alterados:</b> <span class="result">${qtdAumento + qtdReducao}</span> |
    <b class="aumento">Aumentos:</b> <span class="result">${qtdAumento}</span> |
    <b class="reducao">Reduções:</b> <span class="result">${qtdReducao}</span>
    `;*/
    
    document.getElementById("resulTotal").textContent = qtdAumento + qtdReducao;
    document.getElementById("resulAumento").textContent = qtdAumento;
    document.getElementById("resulReducao").textContent = qtdReducao;
    
    mostrarAlerta("Comparação finalizada com sucesso!", "sucesso");
}


//FUNÇÃO QUE GERA PDF DE ALTERAÇÕES
window.gerarPDF = function() {
    const linhas = document.querySelectorAll("#resultado tbody tr");
    
    if (linhas.length === 0) {
        mostrarAlerta("Faça a comparação antes de gerar o PDF!");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    
    // ===============================
    // TÍTULO
    // ===============================
    doc.setFontSize(16);
    doc.text("Relatório de Alterações de Preços", 14, 15);
    
    // DATA
    const agora = new Date().toLocaleString("pt-BR");
    doc.setFontSize(10);
    doc.text("Impresso em: " + agora, 14, 22);
    
    // ===============================
    // RESUMO
    // ===============================
    let yResumo = 30;
    doc.setFontSize(11);
    
    doc.text(`Produtos alterados: ${qtdAumento + qtdReducao}`, 14, yResumo);
    yResumo += 6;
    
    doc.text(`Aumentos: ${qtdAumento}`, 14, yResumo);
    yResumo += 6;
    
    doc.text(`Reduções: ${qtdReducao}`, 14, yResumo);
    
    // ===============================
    // TABELA COM LINHAS
    // ===============================
    doc.autoTable({
        html: "#resultado",
        startY: 50,
        
        styles: {
            fontSize: 6,
            cellPadding: 1,
            lineWidth: 0.2, // LINHAS NAS CÉLULAS
            lineColor: 0 // PRETO
        },
        
        headStyles: {
            lineWidth: 0.3,
            lineColor: 0
        },
        
        bodyStyles: {
            lineWidth: 0.2,
            lineColor: 0
        },
        
        tableLineWidth: 0.3, // BORDA EXTERNA
        tableLineColor: 0
    });
    
    // ===============================
    // SALVAR
    // ===============================
    doc.save("alteracoes_precos.pdf");
};


// LIMPAR REGISTROS
function limparTudo() {
    document.getElementById("oldFile").value = "";
    document.getElementById("newFile").value = "";
    document.querySelector("#resultado tbody").innerHTML = "";
    document.getElementById("busca").value = "";
    document.getElementById("resulTotal").textContent = "0";
    document.getElementById("resulAumento").textContent = "0";
    document.getElementById("resulReducao").textContent = "0";
    
    dadosAntigos = {};
    dadosNovos = {};
    
    mostrarAlerta("Sistema limpo com sucesso!", "sucesso");
}

document.addEventListener("DOMContentLoaded", () => {
    window.btnBar = btnBar;
    
    const fundoBar = document.getElementById("fundo-bar");
    const boxUploadBar = document.getElementById("box-upload");
    const btnBarElement = document.getElementById("btn-bar");
    
    function btnBar() {
        fundoBar.classList.toggle("ativo");
        boxUploadBar.classList.toggle("ativo");
        
        if (btnBarElement) {
            btnBarElement.classList.toggle("ativo");
        }
    }
    
    if (fundoBar) {
        fundoBar.addEventListener('click', () => {
            fundoBar.classList.remove("ativo");
            boxUploadBar.classList.remove("ativo");
            
            if (btnBarElement) {
                btnBarElement.classList.remove("ativo");
            }
        });
    }
});



const popup = document.getElementById("popup");
const btnPopup = document.getElementById("btn-popup");
const fundoPopup = document.getElementById("fundo-popup");

let aberto = false;

window.addEventListener('load', () => {
    if (aberto) return; // evita spam de clique
    
    aberto = true;
    
    setTimeout(() => {
        popup.classList.remove("hidden", "saida");
        popup.style.visibility = "visible";
        
        popup.classList.add("entrada");
        fundoPopup.classList.add("ativo")
    }, 1650)
    
    /* depois de 2s começa fechar
    setTimeout(() => {
      popup.classList.remove("entrada");
      popup.classList.add("saida");
    }, 2000);*/
});

// quando a animação terminar
popup.addEventListener("animationend", (e) => {
    if (e.animationName === "popupReverse") {
        popup.classList.add("hidden");
        popup.style.visibility = "hidden";
        aberto = false;
    }
});


btnPopup.addEventListener('click', () => {
    
    popup.classList.remove("entrada");
    popup.classList.add("saida");
    fundoPopup.classList.remove("ativo")
    
});



//FALAR COMIGO NO WHATTS
/*function zapDev() {
    const numero = "63999789035"; // coloque seu número com DDI (55 + DDD + número)
    
    const mensagem = encodeURIComponent(
        "Olá! Estou entrando em contato através do site. Tenho uma dúvida/sugestão sobre as melhorias da plataforma."
    );
    
    const url = `https://wa.me/${numero}?text=${mensagem}`;
    
    window.open(url, "_blank");
}*/



//REDIRECIONAMENTO PARA O GRUPO
/*function entrarGrupo() {
    const linkGrupo = "https://chat.whatsapp.com/KxwVAxI6KGz20dpXzPHLRN?mode=gi_t";
    
    window.open(linkGrupo, "_blank");
}*/


function destacarAumentosVisualmente() {
    const linhas = document.querySelectorAll("#resultado tbody tr");
    
    linhas.forEach(tr => {
        const colunas = tr.querySelectorAll("td");
        
        // estrutura da sua tabela:
        // 0 NCE | 1 COR | 2 DESC | 3 SALDO | 4 ANTIGO | 5 NOVO | 6 DIF | 7 ESTOQUE
        
        const tdNovoPreco = colunas[5];
        const tdDiferenca = colunas[6];
        
        if (!tdNovoPreco || !tdDiferenca) return;
        
        // verifica se houve aumento pelo texto da diferença
        if (tdDiferenca.textContent.includes("+")) {
            tdNovoPreco.classList.add("preco-aumento");
        }
    });
}


function destacarAumentosVisualmente() {
    const linhas = document.querySelectorAll("#resultado tbody tr");
    
    linhas.forEach(tr => {
        const colunas = tr.querySelectorAll("td");
        
        const tdNovoPreco = colunas[5];
        const tdDiferenca = colunas[6];
        
        if (!tdNovoPreco || !tdDiferenca) return;
        
        const texto = tdDiferenca.textContent;
        
        if (texto.includes("+")) {
            tdNovoPreco.classList.add("preco-aumento");
        }
        
        if (texto.includes("-")) {
            tdNovoPreco.classList.add("preco-reducao");
        }
    });
}