# R&G Forge 3D — Gerador de Orçamentos

Projeto local em HTML, CSS e JavaScript, sem servidor ou banco de dados.

## Estrutura de pastas

```text
rg-forge3d-orcamentos/
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── assets/
    └── images/
        ├── logo.png
        ├── header-industrial.png
        └── LEIA-ME.txt
```

## Onde colocar suas imagens PNG

- **Logomarca:** substitua `assets/images/logo.png` pela sua logomarca em PNG, preferencialmente com fundo transparente. Mantenha exatamente esse nome. A imagem é usada no cabeçalho do sistema, no orçamento e no rodapé.
- **Imagem industrial:** `assets/images/header-industrial.png` é a imagem decorativa do cabeçalho do orçamento. Pode ser substituída por outra imagem PNG mantendo o mesmo nome.
- **Não é usada foto do produto:** a tabela mostra apenas o número do item, descrição, quantidade e valores.

Se preferir, abra o sistema e use o campo de upload de logomarca nas configurações.

## Como usar

1. Extraia o ZIP inteiro para uma pasta.
2. Coloque sua logomarca PNG em `assets/images/logo.png`.
3. Abra `index.html` no Chrome ou Edge.
4. Preencha os dados do cliente e do orçamento.
5. O total é manual por padrão. Para calcular pelos itens, desconto e frete, clique em **Calcular total automaticamente**. Depois você pode editar o valor manualmente.
6. Clique em **Salvar / Imprimir PDF** e selecione **Salvar como PDF**.

## Recursos

- Pré-visualização em tempo real.
- Vários produtos por orçamento.
- Total manual e cálculo automático opcional.
- Desconto, frete, validade, prazo e observações.
- Logomarca PNG configurável.
- Layout escuro com detalhes laranja, pensado para impressão em A4.
- Não exibe imagem do produto.
