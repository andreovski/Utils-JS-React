const ordenarModelosProntuarios = useCallback(() => {
  const prontuarioPorMedico = modelosProntuario.items.filter(
    (prontuario) =>
      getSafe(prontuario, 'funcionarios', []).filter(
        (funcionario) => getSafe(funcionario, 'funcionario.id') === getSafe(eu, 'funcionarioId')
      ).length > 0  
  )
  const prontuarioPorEspecialidade = modelosProntuario.items.filter(
    (prontuario) => getSafe(prontuario, 'especialidades[0].especialidade.nome', []) === 'Cardiologia'
  )
  let prontuarios = modelosProntuario.items

  prontuarios.unshift(...prontuarioPorMedico, ...prontuarioPorEspecialidade)
  prontuarios = [...new Set(prontuarios)]

  return { items: prontuarios, isLoading: ordenarModelosProntuarios.isLoading }
}, [modelosProntuario])
