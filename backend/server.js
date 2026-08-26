app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/atendimento", (req, res) => {
  try {
    const db = lerDB();

    const documento = req.body.documento || "";

    const paciente = {
      id: Date.now(),

      // Identificação
      nome: req.body.nome || "",
      cpf: documento,
      documento: documento,
      dataNascimento: req.body.dataNascimento || "",
      sexo: req.body.sexo || "",
      nomeMae: req.body.nomeMae || "",
      estadoCivil: req.body.estadoCivil || "",

      // Contato
      endereco: req.body.endereco || "",
      telefone: req.body.telefone || "",
      email: req.body.email || "",
      contatoEmergencia: req.body.contatoEmergencia || "",
      telefoneEmergencia: req.body.telefoneEmergencia || "",

      // Atendimento
      tipo: req.body.tipo || "Particular",

      // Status
      status: "triagem",

      // Data do cadastro
      createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);

    salvarDB(db);

    console.log("PACIENTE SALVO:");
    console.log(paciente);

    res.status(201).json({
      sucesso: true,
      mensagem: "Paciente cadastrado com sucesso",
      paciente: paciente
    });

  } catch (erro) {
    console.error("ERRO AO SALVAR:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao salvar paciente",
      erro: erro.message
    });
  }
});
