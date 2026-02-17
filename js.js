let dadosAntigos = {};
let dadosNovos = {};

let totalAumento = 0;
let totalReducao = 0;
let qtdAumento = 0;
let qtdReducao = 0;

// ===============================
// LEITURA DE ARQUIVOS
// ===============================
function lerArquivo(file, callback) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsText(file);
}

// ===============================
// FORMATAÇÃO DINHEIRO
// ===============================
function dinheiroBR(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ===============================
// ALERTA + SOM
// ===============================
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

// ===============================
// EXTRAÇÃO DE DADOS DO TXT (ROBUSTO)
// ===============================
function extrairDados(texto) {
    const linhas = texto.split("\n");
    const produtos = {};

    linhas.forEach(linha => {
        if (!linha.includes("*")) return;

        // limpa caracteres invisíveis
        linha = linha.replace(/\r/g, "").replace(/\t/g, " ").trim();
        linha = linha.replace("*", "").trim();

        // ======================
        // NCE → primeiro número com 5+ dígitos
        // ======================
        const nceMatch = linha.match(/\b\d{5,}\b/);
        if (!nceMatch) return;
        const nce = nceMatch[0];

        // ======================
        // PREÇO → último número da linha
        // ======================
        const precoMatch = linha.match(/([\d.,]+)\s*$/);
        if (!precoMatch) return;

        const preco = parseFloat(precoMatch[1].replace(",", ""));
        if (isNaN(preco)) return;

        linha = linha.replace(/([\d.,]+)\s*$/, "").trim();

        // ======================
        // SALDO
        // ======================
        let saldo = "";
        const saldoMatch = linha.match(/\b\d+\.\d{2}\b/);
        if (saldoMatch) {
            saldo = saldoMatch[0];
            linha = linha.replace(saldo, "").trim();
        }

        // remove grupo + NCE + código interno
        linha = linha.replace(nce, "").trim();
        linha = linha.replace(/^\d+\s*/, "");
        linha = linha.replace(/^\d+\s*/, "");

        // ======================
        // COR → palavras totalmente MAIÚSCULAS no início
        // ======================
        let cor = "";
        let descricao = linha;

        const palavras = linha.split(" ");
        let palavrasCor = [];
        let i = 0;

        while (
            i < palavras.length &&
            /^[A-ZÀ-Ú\/]+$/.test(palavras[i])
        ) {
            palavrasCor.push(palavras[i]);
            i++;
        }

        if (palavrasCor.length > 0) {
            cor = palavrasCor.join(" ");
            descricao = palavras.slice(i).join(" ");
        }

        // ======================
        // LIMPEZA DA DESCRIÇÃO
        // ======================
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

// ===============================
// COMPARAR ARQUIVOS
// ===============================
function comparar() {
    const oldFile = document.getElementById("oldFile").files[0];
    const newFile = document.getElementById("newFile").files[0];

    if (!oldFile || !newFile) {
        mostrarAlerta("Selecione os dois arquivos!");
        return;
    }

    lerArquivo(oldFile, textoAntigo => {
        dadosAntigos = extrairDados(textoAntigo);

        lerArquivo(newFile, textoNovo => {
            dadosNovos = extrairDados(textoNovo);
            mostrarResultado();
        });
    });
}

// ===============================
// FILTRAR TABELA
// ===============================
function filtrarTabela() {
    const termo = document.getElementById("busca").value.toLowerCase();
    const linhas = document.querySelectorAll("#resultado tbody tr");

    linhas.forEach(tr => {
        const texto = tr.innerText.toLowerCase();
        tr.style.display = texto.includes(termo) ? "" : "none";
    });
}

// ===============================
// MOSTRAR RESULTADO
// ===============================
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

            if (antigo === novo) return;

            const diferenca = novo - antigo;
            const valorFormatado = Math.abs(diferenca).toLocaleString("pt-BR",{ minimumFractionDigits:2 });
            const diferencaTexto = diferenca > 0 ? `R$ +${valorFormatado}` : `R$ -${valorFormatado}`;

            if (diferenca > 0) { qtdAumento++; totalAumento += diferenca; }
            else { qtdReducao++; totalReducao += diferenca; }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${nce}</td>
                <td>${produto.cor || "-"}</td>
                <td>${produto.descricao}</td>
                <td>${produto.saldo}</td>
                <td>${dinheiroBR(antigo)}</td>
                <td>${dinheiroBR(novo)}</td>
                <td class="${diferenca > 0 ? 'aumento':'reducao'}">${diferencaTexto}</td>
            `;
            tbody.appendChild(tr);
        }
        else {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${nce}</td>
                <td>${produto.cor || "-"}</td>
                <td>${produto.descricao}</td>
                <td>${produto.saldo}</td>
                <td style="color:blue;font-weight:bold;">NOVO</td>
                <td>${dinheiroBR(produto.preco)}</td>
                <td>-</td>
            `;
            tbody.appendChild(tr);
        }
    });

    document.getElementById("resumo").innerHTML = `
        <b>Produtos alterados:</b> ${qtdAumento + qtdReducao} |
        <b>Aumentos:</b> ${qtdAumento} |
        <b>Reduções:</b> ${qtdReducao}
    `;

    mostrarAlerta("Comparação finalizada com sucesso!", "sucesso");
}

// ===============================
// LIMPAR SISTEMA
// ===============================
function limparTudo() {
    document.getElementById("oldFile").value = "";
    document.getElementById("newFile").value = "";
    document.querySelector("#resultado tbody").innerHTML = "";
    document.getElementById("resumo").innerHTML = "";
    document.getElementById("busca").value = "";

    dadosAntigos = {};
    dadosNovos = {};
    totalAumento = 0;
    totalReducao = 0;
    qtdAumento = 0;
    qtdReducao = 0;

    mostrarAlerta("Sistema limpo com sucesso!", "sucesso");
}

// ===============================
// GERAR PDF
// ===============================
function gerarPDF() {
    const linhas = document.querySelectorAll("#resultado tbody tr");

    if (linhas.length === 0) {
        mostrarAlerta("Faça a comparação antes de gerar o PDF!");
        return;
    }

    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    // Título
    doc.setFontSize(16);
    doc.text("Relatório de Alterações de Preço", 14, 15);

    // Data
    const agora = new Date().toLocaleString("pt-BR");
    doc.setFontSize(10);
    doc.text("Impresso em: " + agora, 14, 22);

    // ======================
    // RESUMO voltou aqui
    // ======================
    let yResumo = 30;
    doc.setFontSize(11);

    doc.text(`Produtos alterados: ${qtdAumento + qtdReducao}`, 14, yResumo);
    yResumo += 6;

    doc.text(`Aumentos: ${qtdAumento}`, 14, yResumo);
    yResumo += 6;

    doc.text(`Reduções: ${qtdReducao}`, 14, yResumo);

    // ======================
    // Tabela
    // ======================
    doc.autoTable({
        html: "#resultado",
        startY: 50,
        styles: {
            fontSize: 5, cellPadding: 2
        }
    });

    doc.save("alteracoes_preco.pdf");

}
