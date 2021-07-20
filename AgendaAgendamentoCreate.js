import React, { memo, useMemo, useCallback, Suspense } from 'react'

import { useTranslation } from 'react-i18next'
import { queryCache } from 'react-query'
import { useLocation } from 'react-router-dom'

import { Formik, Form, Field } from 'formik'
import moment from 'moment'
import * as Yup from 'yup'

import { callAll } from '@sponte/lib-utils/dist/helpers/callAll'
import { getSafe } from '@sponte/lib-utils/dist/helpers/object'

import { useSnackbar } from '@sponte/lib-utils/dist/hooks/useSnackbar'

import { useDisclosure } from '@sponte/lib-utils/src/hooks/useDisclosure'

import { SptBox } from '@sponte/lib-components/dist/elements/Box'
import { SptRow, SptCol } from '@sponte/lib-components/dist/elements/Grid'
import { SptText } from '@sponte/lib-components/dist/elements/Text'

import { SptButton } from '@sponte/lib-components/dist/atoms/Button'
import { SptCardFooter } from '@sponte/lib-components/dist/atoms/Card'
import { SptFormDirtyBlockNavigation } from '@sponte/lib-components/dist/atoms/FormDirtyBlockNavigation'
import { SptHr } from '@sponte/lib-components/dist/atoms/Hr'
import { SptList } from '@sponte/lib-components/dist/atoms/List'
import { SptListItem } from '@sponte/lib-components/dist/atoms/ListItem'
import { SptLoading } from '@sponte/lib-components/dist/atoms/Loading/Loading'
import { SptScrollbar } from '@sponte/lib-components/dist/atoms/Scrollbar'

import { SptDialogConfirmation } from '@sponte/lib-components/dist/molecules/DialogConfirmation'
import { SptFieldFormik } from '@sponte/lib-components/dist/molecules/FieldFormik'
import { SptFormikFieldSpy } from '@sponte/lib-components/dist/molecules/FormikFieldSpy'
import { SptFormTitle } from '@sponte/lib-components/dist/molecules/FormTitle'

import {
  useQueryAgendamentosControllerObterPorId,
  useMutationAgendamentosControllerCadastrar,
  useQueryClientesControllerListarAgendamentos,
  queryAgendamentosControllerObterHorariosOcupadosAgendamentoReplicado,
  useQueryCalendariosControllerObterListaHorariosFuncionamento,
  useQueryContasControllerObterCalendario,
  useQueryCalendariosHorarioFuncionamentoControllerObterPorId,
  useQueryCalendariosControllerObterPorId
} from 'api/saude'

import { useAuth } from 'providers/auth'

import { useCrudDrawerOnEdit } from 'components/CrudDrawer'
import { ErrorBoundary } from 'components/ErrorBoundary'
import { FieldCategoriaAgendamento } from 'components/FieldCategoriaAgendamento'
import { FieldDataAgendamento } from 'components/FieldDataAgendamento'
import { FieldSala } from 'components/FieldSala'
import { FieldSituacaoAgendamento } from 'components/FieldSituacaoAgendamento'

import { getDuracao } from 'pages/admin/Agenda/Agendamento/utils'

import { AgendaAgendamentoLinkTeleconsultaDialog } from '../AgendaAgendamentoLinkTeleconsultaDialog'

import { AgendaAgendamentoCreateEquipamentos } from './AgendaAgendamentoCreateEquipamentos'
import { AgendaAgendamentoCreateHeader } from './AgendaAgendamentoCreateHeader'
import { AgendaAgendamentoCreateMedicos } from './AgendaAgendamentoCreateMedicos'
import { AgendaAgendamentoCreateMultiplo } from './AgendaAgendamentoCreateMultiplo'
import { AgendaAgendamentoCreatePacientes } from './AgendaAgendamentoCreatePacientes'

export const AgendaAgendamentoCreate = memo(() => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SptLoading full size="xl" />}>
        <AgendaAgendamentoCreateComponent />
      </Suspense>
    </ErrorBoundary>
  )
})

const AgendaAgendamentoCreateComponent = memo(() => {
  const { t } = useTranslation()
  const { state } = useLocation()
  const { createSnackbar } = useSnackbar()
  const { eu } = useAuth()

  const onEdit = useCrudDrawerOnEdit()

  const dialogLinkTeleconsultaProps = useDisclosure()
  const dialogAgendamentoMultiploProps = useDisclosure()

  const { data: calendarioFuncionario } = useQueryContasControllerObterCalendario(
    {
      id: getSafe(eu, 'contaAtual.id')
    },
    { funcionarioId: getSafe(state, 'initialValues.agendamentoFuncionarios[0].id', null) }
  )

  const { data: horariosFuncionamento = {} } = useQueryCalendariosControllerObterListaHorariosFuncionamento(
    {
      id: getSafe(calendarioFuncionario, 'id', null)
    },
    { suspense: false }
  )

  const tiposAgendamento = getSafe(horariosFuncionamento, 'itens', []).map((tipo) => {
    const { data: tipoAgendamento = {} } = useQueryCalendariosHorarioFuncionamentoControllerObterPorId({
      id: getSafe(tipo, 'horarioFuncionamentoId', null)
    })

    return tipoAgendamento
  })

  const chaveCategoriaAgendamentoAtual = useMemo(() => {
    const medicoSelecionadoAtual = getSafe(state, 'initialValues.agendamentoFuncionarios[0].id', '')
    const diaAgendamentoAtual = moment(getSafe(state, 'initialValues.dataInicio')).day()
    const horasAgendamentoAtual = [getSafe(state, 'initialValues.horaInicio'), getSafe(state, 'initialValues.horaFim')]

    const tiposAgendamentosDisponiveisMedico = tiposAgendamento.filter(
      (agendamento) =>
        getSafe(agendamento, 'horarioFuncionamento.profissionais', []).filter(
          (profissional) => getSafe(profissional, 'funcionario.id') === medicoSelecionadoAtual
        ).length > 0
    )

    const tiposAgendamentoValido = tiposAgendamentosDisponiveisMedico
      .filter(
        (item) =>
          parseInt(getSafe(item, 'horarioFuncionamento.horaInicio'), 10) <= parseInt(horasAgendamentoAtual[0], 10) &&
          parseInt(getSafe(item, 'horarioFuncionamento.horaFim'), 10) >= parseInt(horasAgendamentoAtual[1], 10)
      )
      .filter(
        (item) =>
          getSafe(item, 'horarioFuncionamento.diasSemana', []).filter(
            (dia) => getSafe(dia, 'diaSemana.codigo') === diaAgendamentoAtual
          ).length > 0
      )

    return getSafe(tiposAgendamentoValido[0], 'categoriaAgendamento.chave', 'CONSULTA')
  }, [state, tiposAgendamento])

  const [cadastrarAgendamento] = useMutationAgendamentosControllerCadastrar({
    useErrorBoundary: false,
    onSuccess: (data) => {
      createSnackbar('success', t('agenda:agendamento.cadastradoSucesso'))

      queryCache.setQueryData([useQueryAgendamentosControllerObterPorId.queryKey, { id: data.id }], data)
      queryCache.invalidateQueries(useQueryClientesControllerListarAgendamentos.queryKey)

      const urlAgendamentoOnline = getSafe(data, 'urlAgendamentoOnline', false)

      if (!getSafe(data, 'clienteTeleConsultaPossuiEmailSms', false) && urlAgendamentoOnline) {
        dialogLinkTeleconsultaProps.onOpen({
          linkTeleconsulta: urlAgendamentoOnline,
          handleClose: () => {
            dialogLinkTeleconsultaProps.onClose()
            onEdit(data)
          }
        })
      } else {
        onEdit(data)
      }
    }
  })

  const initialValues = useMemo(() => {
    return {
      agendamentoClientes: [],
      agendamentoEquipamentos: [],
      agendamentoFuncionarios: [],
      situacaoAgendamento: {
        chave: 'AGENDADO'
      },
      ...getSafe(state, 'initialValues', {}),
      categoriaAgendamento: {
        chave: chaveCategoriaAgendamentoAtual
      }
    }
  }, [state, chaveCategoriaAgendamentoAtual])

  const validationSchema = useMemo(() => {
    return Yup.object().shape(
      {
        diaInteiro: Yup.boolean(),
        categoriaAgendamento: Yup.object().required(t('geral:validacoes.obrigatorio')).nullable(),
        situacaoAgendamento: Yup.object().required(t('geral:validacoes.obrigatorio')).nullable(),
        horaInicio: Yup.string().hoursOrMinutesIsGreaterThanPattern(),
        horaFim: Yup.string().hoursOrMinutesIsGreaterThanPattern(),
        dataInicio: Yup.date()
          .isValidDate()
          .required(t('geral:validacoes.obrigatorio'))
          .typeError(t('geral:validacoes.dataInvalida')),
        dataFim: Yup.date()
          .isValidDate()
          .required(t('geral:validacoes.obrigatorio'))
          .typeError(t('geral:validacoes.dataInvalida'))
          .when('dataInicio', {
            is: (dataInicio) => moment(dataInicio).isValid() && !!dataInicio,
            then: (schema) =>
              schema.min(Yup.ref('dataInicio'), ({ min }) => t('geral:validacoes.dataDeveSerMaiorQue', { date: min }))
          }),
        observacoes: Yup.string().when('categoriaAgendamento', {
          is: (categoriaAgendamento) => getSafe(categoriaAgendamento, 'chave', null) === 'COMPROMISSO',
          then: Yup.string().required(t('geral:validacoes.obrigatorio')).nullable(),
          otherwise: Yup.string().nullable()
        }),
        agendamentoClientes: Yup.array().when('categoriaAgendamento', {
          is: (categoriaAgendamento) => getSafe(categoriaAgendamento, 'chave', null) !== 'COMPROMISSO',
          then: Yup.array().min(1, t('geral:validacoes.obrigatorio')).required(t('geral:validacoes.obrigatorio'))
        }),
        agendamentoFuncionarios: Yup.array()
          .min(1, t('geral:validacoes.obrigatorio'))
          .required(t('geral:validacoes.obrigatorio')),
        totalReplicacoesAgendamento: Yup.number()
          .min(1, ({ min }) => t('geral:validacoes.numeroMinimo', { min }))
          .when(['replicarAgendamento', 'dataUltimoAgendamentoReplicacao'], {
            is: (replicarAgendamento, dataUltimoAgendamentoReplicacao) =>
              replicarAgendamento && !dataUltimoAgendamentoReplicacao,
            then: (schema) => schema.required(t('geral:validacoes.obrigatorio')),
            otherwise: (schema) => schema.nullable()
          })
          .nullable(),
        dataUltimoAgendamentoReplicacao: Yup.date()
          .isValidDate()
          .typeError(t('geral:validacoes.dataInvalida'))
          .minDateToday(t('geral:validacoes.dataMinimaHoje'))
          .when(['replicarAgendamento', 'totalReplicacoesAgendamento'], {
            is: (replicarAgendamento, totalReplicacoesAgendamento) =>
              replicarAgendamento && !totalReplicacoesAgendamento,
            then: (schema) => schema.required(t('geral:validacoes.obrigatorio')),
            otherwise: (schema) => schema.nullable()
          })
      },
      [['totalReplicacoesAgendamento', 'dataUltimoAgendamentoReplicacao']]
    )
  }, [t])

  const handleSubmit = useCallback(
    (values, formik) => {
      const horaInicio = moment(values.horaInicio, ['HH:mm'])
      const horaFim = moment(values.horaFim, ['HH:mm'])

      cadastrarAgendamento(
        {
          nome: t('geral:semPaciente'),
          diaInteiro: values.diaInteiro,
          observacoes: values.observacoes,
          dataHoraInicio: moment(values.dataInicio)
            .set('hours', horaInicio.format('HH'))
            .set('minutes', horaInicio.format('mm'))
            .format(),
          dataHoraFim: moment(values.dataFim)
            .set('hours', horaFim.format('HH'))
            .set('minutes', horaFim.format('mm'))
            .format(),
          categoriaAgendamentoId: getSafe(values, 'categoriaAgendamento.id', null),
          motivoCancelamentoId: getSafe(values, 'motivoCancelamento.id', null),
          salaId: getSafe(values, 'sala.id', null),
          situacaoAgendamentoId: getSafe(values, 'situacaoAgendamento.id', null),
          agendamentoClientes: values.agendamentoClientes.map((agendamentoCliente) => ({
            clienteId: getSafe(agendamentoCliente, 'id', null),
            situacaoAgendamentoId: getSafe(values, 'situacaoAgendamento.id', null)
          })),
          agendamentoFuncionarios: values.agendamentoFuncionarios.map((agendamentoFuncionario) => ({
            funcionarioId: getSafe(agendamentoFuncionario, 'id', null)
          })),
          agendamentoEquipamentos: values.agendamentoEquipamentos.map((agendamentoEquipamento) => ({
            produtoId: getSafe(agendamentoEquipamento, 'id', null)
          })),
          replicarAgendamento: values.replicarAgendamento,
          ...(values.replicarAgendamento && getSafe(values, 'dataUltimoAgendamentoReplicacao', null)
            ? { dataUltimoAgendamentoReplicacao: getSafe(values, 'dataUltimoAgendamentoReplicacao', null) }
            : { totalReplicacoesAgendamento: getSafe(values, 'totalReplicacoesAgendamento', null) })
        },
        {
          onSuccess: () => {
            formik.resetForm({ values })
          },
          onSettled: () => {
            formik.setSubmitting(false)
          }
        }
      )
    },
    [t, cadastrarAgendamento]
  )

  const onSubmit = useCallback(
    (values, formik) => {
      if (values.replicarAgendamento) {
        const horaInicio = moment(values.horaInicio, ['HH:mm'])

        queryAgendamentosControllerObterHorariosOcupadosAgendamentoReplicado({
          funcionarioId: values.agendamentoFuncionarios
            .map((agendamentoFuncionario) => getSafe(agendamentoFuncionario, 'id', null))
            .join(', '),
          dataHoraInicio: moment(values.dataInicio)
            .set('hours', horaInicio.format('HH'))
            .set('minutes', horaInicio.format('mm'))
            .format(),
          ...(getSafe(values, 'dataUltimoAgendamentoReplicacao', null)
            ? { dataUltimoAgendamentoReplicacao: getSafe(values, 'dataUltimoAgendamentoReplicacao', null) }
            : { totalReplicacoesAgendamento: getSafe(values, 'totalReplicacoesAgendamento', null) })
        }).then((data) => {
          if (getSafe(data, 'itens', []).length > 0) {
            dialogAgendamentoMultiploProps.onOpen({
              values,
              formik,
              dataEmUso: moment(data.itens[data.itens.length - 1].dataHoraInicio).format('DD/MM/YYYY')
            })
          } else {
            handleSubmit(values, formik)
          }
        })
      } else {
        handleSubmit(values, formik)
      }
    },
    [handleSubmit, dialogAgendamentoMultiploProps]
  )

  const onChange = useCallback((values, setFieldValue, dirty) => {
    if (dirty && getSafe(values, 'categoriaAgendamento')) {
      const tempoDuracao = moment.duration({
        minutes: moment(getSafe(values, 'categoriaAgendamento.duracao')).format('mm'),
        hours: moment(getSafe(values, 'categoriaAgendamento.duracao')).format('HH')
      })

      const horaInicioDuracao = moment.duration(values.horaInicio)

      if (moment(values.horaInicio).isValid()) {
        setFieldValue('horaFim', moment(values.horaInicio).add(tempoDuracao))
        setFieldValue('horaInicio', moment().format('HH:mm'))
      } else if (horaInicioDuracao.asMilliseconds() > 0) {
        const horaInicio =
          horaInicioDuracao.asMilliseconds() > 0
            ? moment().startOf('day').add(horaInicioDuracao.asMilliseconds(), 'milliseconds')
            : moment()

        setFieldValue('horaFim', horaInicio.add(tempoDuracao).format('HH:mm'))
      } else {
        setFieldValue('horaInicio', moment().format('HH:mm'))
        setFieldValue('horaFim', moment().add(tempoDuracao).format('HH:mm'))
      }
    }
  }, [])

  return (
    <>
      <SptScrollbar>
        <Formik
          onSubmit={onSubmit}
          initialValues={initialValues}
          validationSchema={validationSchema}
          validateOnBlur={false}
        >
          {({ isSubmitting, values, setFieldValue, dirty }) => (
            <Form noValidate>
              <AgendaAgendamentoCreateHeader />

              <SptFormDirtyBlockNavigation />

              <SptFormikFieldSpy field="categoriaAgendamento" onChange={() => onChange(values, setFieldValue, dirty)} />

              <SptBox p={15} pt={0}>
                <AgendaAgendamentoCreatePacientes />

                <SptHr />

                <AgendaAgendamentoCreateMedicos />

                <SptHr />

                <AgendaAgendamentoCreateEquipamentos />

                <SptHr />

                <SptFormTitle icon="spt-form" title={t('geral:informacoes')} />

                <SptRow>
                  <SptCol width={{ _: 1, tablet: 1 / 2 }}>
                    <FieldCategoriaAgendamento
                      name="categoriaAgendamento"
                      label={t('geral:tipoAgendamento')}
                      required
                    />
                  </SptCol>

                  <SptCol width={{ _: 1, tablet: 1 / 2 }}>
                    <FieldSituacaoAgendamento name="situacaoAgendamento" label={t('geral:situacao')} required />
                  </SptCol>
                </SptRow>

                <SptRow>
                  <SptCol>
                    <FieldSala name="sala" label={t('geral:local')} />
                  </SptCol>
                </SptRow>

                <SptHr />

                <SptFormTitle icon="spt-form" title={t('geral:dataEHora')} />

                <SptRow>
                  <SptCol width={{ _: 1, tablet: 1 / 2 }}>
                    <FieldDataAgendamento name="dataInicio" label={t('geral:dataInicio')} required />
                  </SptCol>

                  <SptCol width={{ _: 1, tablet: 1 / 2 }}>
                    <FieldDataAgendamento name="dataFim" label={t('geral:dataFim')} required />
                  </SptCol>
                </SptRow>

                <SptRow>
                  <SptCol width={{ _: 1, tablet: 1 / 2 }}>
                    <Field
                      type="timeMask"
                      name="horaInicio"
                      label={t('geral:horarioInicio')}
                      required
                      component={SptFieldFormik}
                      hasValue={getSafe(values, 'horaInicio')}
                    />
                  </SptCol>

                  <SptCol width={{ _: 1, tablet: 1 / 2 }}>
                    <Field
                      type="timeMask"
                      name="horaFim"
                      label={t('geral:horarioFim')}
                      required
                      component={SptFieldFormik}
                      hasValue={getSafe(values, 'horaFim')}
                    />
                  </SptCol>
                </SptRow>

                <SptRow>
                  <SptCol>
                    <SptList>
                      <SptListItem
                        primaryText={t('geral:duracao')}
                        action={
                          <SptText fontWeight="bold" fontSize="large" color="primary">
                            {getDuracao(values)}
                          </SptText>
                        }
                      />
                    </SptList>
                  </SptCol>
                </SptRow>

                <AgendaAgendamentoCreateMultiplo />

                <SptHr />

                <SptFormTitle icon="spt-form" title={t('geral:observacoes')} />

                <SptRow>
                  <SptCol>
                    <Field
                      name="observacoes"
                      textarea
                      label={t('geral:observacoes')}
                      minRows={2}
                      maxRows={5}
                      required={getSafe(values, 'categoriaAgendamento.chave', null) === 'COMPROMISSO'}
                      component={SptFieldFormik}
                    />
                  </SptCol>
                </SptRow>
              </SptBox>

              <SptCardFooter>
                <SptButton
                  type="submit"
                  iconLeft="spt-done"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  data-testid="cadastrar"
                >
                  {t('geral:salvar')}
                </SptButton>
              </SptCardFooter>
            </Form>
          )}
        </Formik>
      </SptScrollbar>

      {dialogLinkTeleconsultaProps.isOpen && (
        <AgendaAgendamentoLinkTeleconsultaDialog {...dialogLinkTeleconsultaProps} />
      )}

      <SptDialogConfirmation
        opened={dialogAgendamentoMultiploProps.isOpen}
        onCancelText="geral:cancelar"
        confirmText={t('geral:confirmar')}
        confirmPalette="primary"
        onCancel={callAll(
          dialogAgendamentoMultiploProps.onClose,
          () => dialogAgendamentoMultiploProps && dialogAgendamentoMultiploProps.formik.setSubmitting(false)
        )}
        onConfirm={() => handleSubmit(dialogAgendamentoMultiploProps.values, dialogAgendamentoMultiploProps.formik)}
      >
        {t('geral:agendamentoMultiploDataOcupada', { date: dialogAgendamentoMultiploProps.dataEmUso })}
      </SptDialogConfirmation>
    </>
  )
})
