"use client";

import React, { useEffect, useRef, useState } from "react";
import { celulasService } from "@/services/celulasService";
import { membersService } from "@/services/membersService";
import { reportsService } from "@/services/reportsService";
import { Celula, Member } from "@/types";
import toast from "react-hot-toast";
import Link from "next/link";
import { LuHistory } from "react-icons/lu";
import { FiPlus, FiCheck } from "react-icons/fi";
import {
  createTheme,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ThemeProvider,
} from "@mui/material";
import MemberModal from "@/components/MemberModal";
import AddMemberChoiceModal from "@/components/AddMemberChoiceModal";
import ModalConfirm from "@/components/ModalConfirm";
import ReportReplaceModal from "@/components/ReportReplaceModal";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import { useAuth } from "@/contexts/AuthContext";

interface WeekReport {
  startDate: Dayjs;
  endDate: Dayjs;
  hasCelulaReport: boolean;
  hasCultoReport: boolean;
}

export default function ReportPage() {
  const { user, isLoading } = useAuth();
  const hasLoadedRef = useRef(false);
  const lastLoadedUserIdRef = useRef<number | null>(null);
  const [groups, setGroups] = useState<Celula[]>([]);
  const [allCelulas, setAllCelulas] = useState<Celula[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [selectedCelula, setSelectedCelula] = useState<Celula | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [presentMap, setPresentMap] = useState<Record<number, boolean>>({});
  const [reportDate, setReportDate] = useState<Dayjs | null>(null);
  const [reportType, setReportType] = useState<"CELULA" | "CULTO">("CELULA");
  const [pendingDate, setPendingDate] = useState<Dayjs | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [weekReports, setWeekReports] = useState<WeekReport[]>([]);
  const [showWeeklyView, setShowWeeklyView] = useState(true);
  const [hasCheckedAutoRedirect, setHasCheckedAutoRedirect] = useState(false);
  const [allCelulasWeekReports, setAllCelulasWeekReports] = useState<
    Map<number, WeekReport[]>
  >(new Map());
  const [visibleWeeksCount, setVisibleWeeksCount] = useState(4);
  const [visibleWeeksCountMap, setVisibleWeeksCountMap] = useState<
    Map<number, number>
  >(new Map());
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const load = async () => {
      if (!user || isLoading) return;

      if (hasLoadedRef.current && lastLoadedUserIdRef.current === user.id) {
        return;
      }

      hasLoadedRef.current = true;
      lastLoadedUserIdRef.current = user.id;

      try {
        // Primeiro tentar carregar "suas células" (onde o usuário é líder ou vice-líder)
        const ownCelulas = await loadOwnCelulas();

        // Carregar todas as células do sistema
        const allCelulasData = await celulasService.getCelulas();
        setAllCelulas(allCelulasData);

        if (ownCelulas.length > 0) {
          // Tem células onde é líder
          setGroups(ownCelulas);

          // Verificar se deve redirecionar automaticamente
          let redirected = false;
          if (!hasCheckedAutoRedirect) {
            redirected = await checkAndRedirectToPendingReport(ownCelulas);
            setHasCheckedAutoRedirect(true);
          }

          // Se não foi redirecionado, definir seleção padrão
          if (!redirected) {
            // Se tem apenas uma célula, selecionar automaticamente
            if (ownCelulas.length === 1) {
              setSelectedGroup(ownCelulas[0].id);
              setSelectedCelula(ownCelulas[0]);
            } else {
              // Se tem múltiplas células, selecionar "Suas Células" por padrão
              setSelectedGroup(-1);
              setSelectedCelula(null);
            }
          }
        } else {
          // Usuário não tem células, selecionar "Todas as Células" por padrão
          setGroups([]);
          setSelectedGroup(-2);
          setSelectedCelula(null);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [user, isLoading]);

  // Função para carregar células do usuário (líder ou vice-líder)
  const loadOwnCelulas = async (): Promise<Celula[]> => {
    if (!user) return [];

    const ledCelulas = await celulasService.getCelulas({
      leaderMemberId: user.id,
    });
    const viceLedCelulas = await celulasService.getCelulas({
      viceLeaderMemberId: user.id,
    });

    const combined = [...ledCelulas, ...viceLedCelulas];
    return Array.from(new Map(combined.map((c) => [c.id, c])).values());
  };

  // Função para verificar e redirecionar para relatório pendente
  const checkAndRedirectToPendingReport = async (
    celulas: Celula[],
  ): Promise<boolean> => {
    if (!celulas || celulas.length === 0) return false;

    // Pegar a primeira célula sem relatório de CELULA na semana atual
    for (const celula of celulas) {
      const hasReport = await checkCelulaHasWeekReport(celula.id);
      if (!hasReport) {
        // Encontrou célula sem relatório, abrir formulário
        setSelectedGroup(celula.id);
        setSelectedCelula(celula);
        setReportType("CELULA");
        setShowWeeklyView(false);

        // Definir data para o dia da célula na semana atual
        const today = dayjs();
        if (celula.weekday !== null && celula.weekday !== undefined) {
          const currentWeekStart = today.startOf("week");
          const celulaDayThisWeek = currentWeekStart.day(celula.weekday);
          setReportDate(celulaDayThisWeek);
        } else {
          setReportDate(today);
        }

        return true; // Retorna true indicando que redirecionou
      }
    }

    return false; // Não redirecionou
  };

  // Função para verificar se a célula tem relatório na semana atual
  const checkCelulaHasWeekReport = async (
    celulaId: number,
  ): Promise<boolean> => {
    try {
      const today = dayjs();
      const weekStart = today.startOf("week"); // Domingo
      const weekEnd = today.endOf("week"); // Sábado

      // Buscar todas as datas com relatórios de uma vez
      const { celulaDates } = await reportsService.getReportDates(celulaId);
      const celulaDatesSet = new Set(celulaDates);

      // Verificar se existe relatório de CELULA nesta semana
      for (let i = 0; i <= 6; i++) {
        const checkDate = weekStart.add(i, "day").format("YYYY-MM-DD");
        if (celulaDatesSet.has(checkDate)) {
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error("Erro ao verificar relatório:", e);
      return false; // Em caso de erro, assumir que não tem relatório
    }
  };

  // Gerar semanas desde a criação da célula
  useEffect(() => {
    if (!selectedCelula) {
      setWeekReports([]);
      setVisibleWeeksCount(4);
      return;
    }

    const loadWeekReports = async () => {
      const weeks: WeekReport[] = [];
      const celulaCreationDate = dayjs(selectedCelula.createdAt);
      const today = dayjs();

      // Buscar todas as datas com relatórios de uma vez
      let celulaDatesSet = new Set<string>();
      let cultoDatesSet = new Set<string>();

      try {
        const { celulaDates, cultoDates } = await reportsService.getReportDates(
          selectedCelula.id,
        );
        celulaDatesSet = new Set(celulaDates);
        cultoDatesSet = new Set(cultoDates);
      } catch (e) {
        console.error("Erro ao buscar datas de relatórios:", e);
      }

      let currentWeekStart = celulaCreationDate.startOf("week");

      while (
        currentWeekStart.isBefore(today, "day") ||
        currentWeekStart.isSame(today, "day")
      ) {
        const weekEnd = currentWeekStart.endOf("week");

        // Se a célula tem um dia da semana definido, verificar se a data válida é após a criação
        let shouldIncludeWeek = true;
        if (
          selectedCelula.weekday !== null &&
          selectedCelula.weekday !== undefined
        ) {
          const validDateInWeek = currentWeekStart.day(selectedCelula.weekday);
          // Pular semana se a data válida for antes da criação da célula
          if (validDateInWeek.isBefore(celulaCreationDate, "day")) {
            shouldIncludeWeek = false;
          }
        }

        if (shouldIncludeWeek) {
          // Verificar se existe relatório de CELULA nesta semana
          let hasCelulaReport = false;
          for (let i = 0; i <= 6; i++) {
            const checkDate = currentWeekStart
              .add(i, "day")
              .format("YYYY-MM-DD");
            if (celulaDatesSet.has(checkDate)) {
              hasCelulaReport = true;
              break;
            }
          }

          // Verificar se existe relatório de CULTO nesta semana
          let hasCultoReport = false;
          for (let i = 0; i <= 6; i++) {
            const checkDate = currentWeekStart
              .add(i, "day")
              .format("YYYY-MM-DD");
            if (cultoDatesSet.has(checkDate)) {
              hasCultoReport = true;
              break;
            }
          }

          weeks.push({
            startDate: currentWeekStart,
            endDate: weekEnd,
            hasCelulaReport,
            hasCultoReport,
          });
        }

        currentWeekStart = currentWeekStart.add(1, "week");
      }

      setWeekReports(weeks.reverse());
    };

    loadWeekReports();
  }, [selectedCelula, reloadTrigger]);

  // Gerar semanas para todas as células quando "Todas as Células" estiver selecionado
  useEffect(() => {
    if (selectedGroup !== -1 && selectedGroup !== -2) {
      setAllCelulasWeekReports(new Map());
      setVisibleWeeksCountMap(new Map());
      return;
    }

    const loadAllCelulasWeekReports = async () => {
      const reportsMap = new Map<number, WeekReport[]>();
      const initialCountMap = new Map<number, number>();

      // Determinar quais células carregar
      const celulasToLoad = selectedGroup === -1 ? groups : allCelulas;

      for (const celula of celulasToLoad) {
        const weeks: WeekReport[] = [];
        const celulaCreationDate = dayjs(celula.createdAt);
        const today = dayjs();

        let celulaDatesSet = new Set<string>();
        let cultoDatesSet = new Set<string>();

        try {
          const { celulaDates, cultoDates } =
            await reportsService.getReportDates(celula.id);
          celulaDatesSet = new Set(celulaDates);
          cultoDatesSet = new Set(cultoDates);
        } catch (e) {
          console.error("Erro ao buscar datas de relatórios:", e);
        }

        let currentWeekStart = celulaCreationDate.startOf("week");

        while (
          currentWeekStart.isBefore(today, "day") ||
          currentWeekStart.isSame(today, "day")
        ) {
          const weekEnd = currentWeekStart.endOf("week");

          // Se a célula tem um dia da semana definido, verificar se a data válida é após a criação
          let shouldIncludeWeek = true;
          if (celula.weekday !== null && celula.weekday !== undefined) {
            const validDateInWeek = currentWeekStart.day(celula.weekday);
            // Pular semana se a data válida for antes da criação da célula
            if (validDateInWeek.isBefore(celulaCreationDate, "day")) {
              shouldIncludeWeek = false;
            }
          }

          if (shouldIncludeWeek) {
            let hasCelulaReport = false;
            for (let i = 0; i <= 6; i++) {
              const checkDate = currentWeekStart
                .add(i, "day")
                .format("YYYY-MM-DD");
              if (celulaDatesSet.has(checkDate)) {
                hasCelulaReport = true;
                break;
              }
            }

            let hasCultoReport = false;
            for (let i = 0; i <= 6; i++) {
              const checkDate = currentWeekStart
                .add(i, "day")
                .format("YYYY-MM-DD");
              if (cultoDatesSet.has(checkDate)) {
                hasCultoReport = true;
                break;
              }
            }

            weeks.push({
              startDate: currentWeekStart,
              endDate: weekEnd,
              hasCelulaReport,
              hasCultoReport,
            });
          }

          currentWeekStart = currentWeekStart.add(1, "week");
        }

        reportsMap.set(celula.id, weeks.reverse());
        initialCountMap.set(celula.id, 4);
      }

      setAllCelulasWeekReports(reportsMap);
      setVisibleWeeksCountMap(initialCountMap);
    };

    loadAllCelulasWeekReports();
  }, [selectedGroup, groups, allCelulas, reloadTrigger]);

  // Função auxiliar para calcular datas válidas
  const getValidDates = (celula: Celula | undefined): Dayjs[] => {
    if (!celula || celula.weekday === null || celula.weekday === undefined) {
      return []; // Sem restrição se não tiver dia da semana
    }

    const dates: Dayjs[] = [];
    const today = dayjs();

    // Gerar 52 ocorrências passadas
    for (let i = 1; i <= 52; i++) {
      let date = today.subtract(i, "week");
      const currentWeekday = date.day();
      const targetWeekday = celula.weekday;
      const diff = targetWeekday - currentWeekday;
      date = date.add(diff, "day");
      dates.unshift(date); // Adicionar no início para manter ordem cronológica
    }

    // Gerar próximas 52 ocorrências (futuras + hoje)
    for (let i = 0; i < 52; i++) {
      let date = today.add(i, "week");
      const currentWeekday = date.day();
      const targetWeekday = celula.weekday;
      const diff = targetWeekday - currentWeekday;
      date = date.add(diff, "day");
      dates.push(date);
    }

    return dates;
  };

  // Verificar se uma data é válida (dia da semana da célula)
  const isValidDate = (date: Dayjs, celula: Celula | undefined): boolean => {
    if (!celula || celula.weekday === null || celula.weekday === undefined) {
      return true; // Sem restrição se não tiver dia da semana
    }
    return date.day() === celula.weekday;
  };

  // Atualizar data selecionada quando a célula mudar
  useEffect(() => {
    if (selectedGroup === null) {
      setReportDate(null);
      return;
    }

    if (selectedGroup === -1 || selectedGroup === -2) {
      // "Suas Células" ou "Todas as Células" selecionado
      setSelectedCelula(null);
      setReportDate(null);
      return;
    }

    const celula =
      groups.find((g) => g.id === selectedGroup) ||
      allCelulas.find((c) => c.id === selectedGroup);
    setSelectedCelula(celula || null);

    if (!celula || celula.weekday === null || celula.weekday === undefined) {
      setReportDate(dayjs());
      return;
    }

    const validDates = getValidDates(celula);
    const today = dayjs();

    // Verificar se hoje é uma data válida
    const todayIsValid = validDates.some((d) => d.isSame(today, "day"));

    if (todayIsValid) {
      setReportDate(today);
    } else if (validDates.length > 0) {
      // Selecionar a data válida anterior mais próxima
      const previousValidDate = [...validDates]
        .reverse()
        .find((d) => d.isBefore(today, "day"));
      setReportDate(previousValidDate || validDates[0]);
    } else {
      setReportDate(today);
    }
  }, [selectedGroup, groups, allCelulas]);

  useEffect(() => {
    const updateDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    updateDarkMode();
    window.addEventListener("storage", updateDarkMode);
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      window.removeEventListener("storage", updateDarkMode);
      observer.disconnect();
    };
  }, []);

  const reloadMembers = async () => {
    if (selectedGroup === null) return;
    try {
      const m = await membersService.getMembers(selectedGroup);
      setMembers(m);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao carregar membros");
    }
  };

  useEffect(() => {
    // Só carregar membros quando estiver na tela de preenchimento
    if (
      selectedGroup === null ||
      selectedGroup === -1 ||
      selectedGroup === -2 ||
      showWeeklyView
    ) {
      setMembers([]);
      setPresentMap({});
      return;
    }

    const loadMembers = async () => {
      try {
        const m = await membersService.getMembers(selectedGroup);
        setMembers(m);
        const map: Record<number, boolean> = {};
        m.forEach((mm: Member) => {
          map[mm.id] = false;
        });
        setPresentMap(map);
      } catch (e) {
        console.error(e);
      }
    };
    loadMembers();
  }, [selectedGroup, showWeeklyView]);

  const togglePresent = (memberId: number) => {
    setPresentMap((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const handleSubmitReport = async () => {
    if (!selectedGroup) return toast.error("Selecione uma célula");
    if (!reportDate) return toast.error("Selecione uma data");

    const memberIds = members
      .filter((m) => !!presentMap[m.id])
      .map((m) => m.id);
    if (memberIds.length === 0)
      return toast.error("Marque pelo menos um membro presente");

    setIsSubmitting(true);
    try {
      await reportsService.createReport(selectedGroup, {
        memberIds,
        date: reportDate.format("YYYY-MM-DD"),
        type: reportType,
      });
      toast.success("Relatório enviado com sucesso!");
      setShowReplaceModal(false);

      // Limpar seleções
      const map: Record<number, boolean> = {};
      members.forEach((mm: Member) => {
        map[mm.id] = false;
      });
      setPresentMap(map);

      // Voltar para visão semanal e forçar reload dos relatórios
      setReloadTrigger((prev) => prev + 1);
      if (!showWeeklyView) {
        setShowWeeklyView(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar relatório");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submit = async () => {
    if (!reportDate || !selectedGroup) return;

    try {
      const result = await reportsService.checkReportExists(
        selectedGroup,
        reportDate.format("YYYY-MM-DD"),
        reportType,
      );

      if (result.exists) {
        setShowReplaceModal(true);
      } else {
        await handleSubmitReport();
      }
    } catch (e) {
      console.error(e);
      await handleSubmitReport();
    }
  };

  const loadMoreWeeks = () => {
    setVisibleWeeksCount((prev) => prev + 4);
  };

  const loadMoreWeeksForCelula = (celulaId: number) => {
    setVisibleWeeksCountMap((prev) => {
      const newMap = new Map(prev);
      const currentCount = newMap.get(celulaId) || 4;
      newMap.set(celulaId, currentCount + 4);
      return newMap;
    });
  };

  const handleWeekCardClick = (
    type: "CELULA" | "CULTO",
    startDate: Dayjs,
    endDate: Dayjs,
    celulaId?: number,
  ) => {
    setShowWeeklyView(false);
    setReportType(type);

    // Se foi clicado em um card de célula específica na visualização "Suas Células" ou "Todas as Células"
    if (celulaId && (selectedGroup === -1 || selectedGroup === -2)) {
      setSelectedGroup(celulaId);
      const celula =
        groups.find((g) => g.id === celulaId) ||
        allCelulas.find((c) => c.id === celulaId);
      setSelectedCelula(celula || null);

      if (
        type === "CELULA" &&
        celula?.weekday !== null &&
        celula?.weekday !== undefined
      ) {
        const celulaDayInWeek = startDate.day(celula.weekday);
        setReportDate(celulaDayInWeek);
      } else if (type === "CULTO") {
        setReportDate(startDate);
      } else {
        setReportDate(startDate);
      }
      return;
    }

    if (
      type === "CELULA" &&
      selectedCelula?.weekday !== null &&
      selectedCelula?.weekday !== undefined
    ) {
      const celulaDayInWeek = startDate.day(selectedCelula.weekday);
      setReportDate(celulaDayInWeek);
    } else if (type === "CULTO") {
      setReportDate(startDate);
    } else {
      setReportDate(startDate);
    }
  };

  const handleAddExistingMember = async (memberId: number) => {
    if (!selectedGroup) return;
    try {
      await membersService.updateMember(selectedGroup, memberId, {
        celulaId: selectedGroup,
      });
      await reloadMembers();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleCreateNewMember = () => {
    setIsChoiceModalOpen(false);
    setIsAddMemberModalOpen(true);
  };

  const handleSaveMember = async (data: Partial<Member>): Promise<Member> => {
    try {
      const created = await membersService.addMember(
        selectedGroup,
        data as Partial<Member> & { name: string },
      );
      toast.success("Membro adicionado com sucesso");

      setIsAddMemberModalOpen(false);
      await reloadMembers();

      // Enviar convite em background após fechar o modal
      if (data.hasSystemAccess && data.email && data.email.trim()) {
        // Enviar em background sem bloquear
        membersService
          .sendInvite(created.id)
          .then((response) => {
            const message = response.whatsappSent
              ? "Convite enviado por email e WhatsApp"
              : "Convite enviado por email";
            toast.success(message);
          })
          .catch((inviteErr: any) => {
            console.error("Erro ao enviar convite:", inviteErr);
            toast.error(
              inviteErr.response?.data?.message ||
                "Erro ao enviar convite, mas o membro foi salvo",
            );
          });
      }

      return created;
    } catch (e) {
      console.error(e);
      toast.error("Falha ao adicionar membro");
      throw e;
    }
  };

  // Função para confirmar mudança de data
  const handleDateChange = (newDate: Dayjs | null) => {
    if (!newDate) {
      setReportDate(newDate);
      return;
    }

    const celula = allCelulas.find((g) => g.id === selectedGroup);

    // Se não há célula selecionada ou não há dia da semana definido, aceita qualquer data
    if (!celula || celula.weekday === null || celula.weekday === undefined) {
      setReportDate(newDate);
      return;
    }

    // Se a data é válida (dia da semana correto), aceita diretamente
    if (isValidDate(newDate, celula)) {
      setReportDate(newDate);
      return;
    }

    // Se a data não é válida, mostra modal de confirmação
    setPendingDate(newDate);
    setShowConfirmModal(true);
  };

  const handleConfirmDate = () => {
    setReportDate(pendingDate);
    setShowConfirmModal(false);
    setPendingDate(null);
  };

  const handleCancelDate = () => {
    setShowConfirmModal(false);
    setPendingDate(null);
  };

  // Componente customizado para destacar os dias válidos
  const CustomDay = (props: PickersDayProps) => {
    const { day, ...other } = props;
    const celula = allCelulas.find((g) => g.id === selectedGroup);
    const isValid = isValidDate(day, celula);

    return (
      <PickersDay
        {...other}
        day={day}
        sx={{
          ...(isValid &&
            celula?.weekday !== null &&
            celula?.weekday !== undefined && {
              backgroundColor: isDarkMode
                ? "rgba(96, 165, 250, 0.2)"
                : "rgba(59, 130, 246, 0.1)",
              "&:hover": {
                backgroundColor: isDarkMode
                  ? "rgba(96, 165, 250, 0.3)"
                  : "rgba(59, 130, 246, 0.2)",
              },
            }),
        }}
      />
    );
  };

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? "dark" : "light",
      primary: {
        main: isDarkMode ? "#ffffffff" : "#000000ff",
      },
    },
  });

  if (showWeeklyView) {
    return (
      <div className="min-h-screen">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Relatórios Semanais</h2>
          <Link
            href="/report/view"
            className="p-2 rounded hover:bg-gray-800"
            aria-label="Acompanhamento"
          >
            <LuHistory className="h-6 w-6 text-teal-600" aria-hidden />
          </Link>
        </div>

        <ThemeProvider theme={muiTheme}>
          <div className="mb-6">
            <FormControl fullWidth>
              <InputLabel id="group-select-label">
                Selecione a célula
              </InputLabel>
              <Select
                labelId="group-select-label"
                value={selectedGroup ?? ""}
                label="Selecione a célula"
                onChange={(e) =>
                  setSelectedGroup(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                {groups.length > 1 && (
                  <MenuItem value={-1}>Suas Células</MenuItem>
                )}
                {((user?.permission?.ministryType !== "LEADER" &&
                  user?.permission?.ministryType !== "LEADER_IN_TRAINING") || user.permission.isAdmin) && (
                    <MenuItem value={-2}>Todas as Células</MenuItem>
                  )}
                {allCelulas.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </ThemeProvider>

        {(selectedGroup === -1 || selectedGroup === -2) && (
          <div className="space-y-6">
            {(selectedGroup === -1 ? groups : allCelulas).map((celula) => {
              const celularWeekReports =
                allCelulasWeekReports.get(celula.id) || [];
              const visibleCount = visibleWeeksCountMap.get(celula.id) || 4;
              const visibleReports = celularWeekReports.slice(0, visibleCount);
              const hasMore = visibleCount < celularWeekReports.length;

              return (
                <div
                  key={celula.id}
                  className="border-2 border-gray-600 rounded-lg p-4"
                >
                  <h3 className="text-xl font-semibold mb-4">{celula.name}</h3>
                  {celularWeekReports.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {visibleReports.map((week, idx) => {
                          const isComplete =
                            week.hasCelulaReport && week.hasCultoReport;
                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                isComplete
                                  ? "border-green-500 bg-green-900/20"
                                  : "border-gray-600 bg-gray-800"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <div>
                                  <h4 className="font-semibold text-lg">
                                    Semana de {week.startDate.format("DD/MM")} a{" "}
                                    {week.endDate.format("DD/MM/YYYY")}
                                  </h4>
                                  <p className="text-sm text-gray-400">
                                    Domingo a Sábado
                                  </p>
                                </div>
                                {isComplete && (
                                  <FiCheck className="h-8 w-8 text-green-600" />
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() =>
                                    handleWeekCardClick(
                                      "CELULA",
                                      week.startDate,
                                      week.endDate,
                                      celula.id,
                                    )
                                  }
                                  className={`p-3 rounded-lg border-2 transition-all ${
                                    week.hasCelulaReport
                                      ? "border-green-500 bg-green-800/30 text-green-200"
                                      : "border-gray-600 hover:border-blue-500"
                                  }`}
                                >
                                  <div className="font-medium">Célula</div>
                                  {week.hasCelulaReport && (
                                    <FiCheck className="h-5 w-5 mx-auto mt-1" />
                                  )}
                                </button>

                                <button
                                  onClick={() =>
                                    handleWeekCardClick(
                                      "CULTO",
                                      week.startDate,
                                      week.endDate,
                                      celula.id,
                                    )
                                  }
                                  className={`p-3 rounded-lg border-2 transition-all ${
                                    week.hasCultoReport
                                      ? "border-green-500 bg-green-800/30 text-green-200"
                                      : "border-gray-600 hover:border-blue-500"
                                  }`}
                                >
                                  <div className="font-medium">Culto</div>
                                  {week.hasCultoReport && (
                                    <FiCheck className="h-5 w-5 mx-auto mt-1" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {hasMore && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => loadMoreWeeksForCelula(celula.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Carregar mais
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      Nenhuma semana disponível para relatórios
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedCelula && weekReports.length > 0 && (
          <div className="space-y-4">
            {weekReports.slice(0, visibleWeeksCount).map((week, idx) => {
              const isComplete = week.hasCelulaReport && week.hasCultoReport;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isComplete
                      ? "border-green-500 bg-green-900/20"
                      : "border-gray-600 bg-gray-800"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Semana de {week.startDate.format("DD/MM")} a{" "}
                        {week.endDate.format("DD/MM/YYYY")}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Domingo a Sábado
                      </p>
                    </div>
                    {isComplete && (
                      <FiCheck className="h-8 w-8 text-green-600" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        handleWeekCardClick(
                          "CELULA",
                          week.startDate,
                          week.endDate,
                        )
                      }
                      className={`p-3 rounded-lg border-2 transition-all ${
                        week.hasCelulaReport
                          ? "border-green-500 bg-green-800/30 text-green-200"
                          : "border-gray-600 hover:border-blue-500"
                      }`}
                    >
                      <div className="font-medium">Célula</div>
                      {week.hasCelulaReport && (
                        <FiCheck className="h-5 w-5 mx-auto mt-1" />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        handleWeekCardClick(
                          "CULTO",
                          week.startDate,
                          week.endDate,
                        )
                      }
                      className={`p-3 rounded-lg border-2 transition-all ${
                        week.hasCultoReport
                          ? "border-green-500 bg-green-800/30 text-green-200"
                          : "border-gray-600 hover:border-blue-500"
                      }`}
                    >
                      <div className="font-medium">Culto</div>
                      {week.hasCultoReport && (
                        <FiCheck className="h-5 w-5 mx-auto mt-1" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            {visibleWeeksCount < weekReports.length && (
              <div className="text-center mt-4">
                <button
                  onClick={loadMoreWeeks}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </div>
        )}

        {selectedCelula && weekReports.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Nenhuma semana disponível para relatórios
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => setShowWeeklyView(true)}
          className="text-blue-600 hover:underline flex items-center gap-2"
        >
          ← Voltar para visão semanal
        </button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">
        Preencher Relatório de {reportType === "CELULA" ? "Célula" : "Culto"}
      </h2>

      <ThemeProvider theme={muiTheme}>
        <div className="mb-4">
          <FormControl fullWidth>
            <InputLabel id="group-select-label">Selecione a célula</InputLabel>
            <Select
              labelId="group-select-label"
              value={selectedGroup ?? ""}
              label="Selecione a célula"
              onChange={(e) =>
                setSelectedGroup(e.target.value ? Number(e.target.value) : null)
              }
            >
              {allCelulas.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo de Relatório
            </label>
            <FormControl fullWidth>
              <Select
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as "CELULA" | "CULTO")
                }
              >
                <MenuItem value="CELULA">Célula</MenuItem>
                <MenuItem value="CULTO">Culto</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Data do relatório
            </label>
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale="pt-br"
            >
              <DatePicker
                value={reportDate}
                onChange={handleDateChange}
                format="DD/MM/YYYY"
                slots={{
                  day: CustomDay,
                }}
                localeText={{
                  toolbarTitle: "Selecionar data",
                  cancelButtonLabel: "Cancelar",
                  okButtonLabel: "OK",
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                  },
                }}
              />
            </LocalizationProvider>
          </div>
        </div>
      </ThemeProvider>

      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Membros</h3>
          <button
            onClick={() => setIsChoiceModalOpen(true)}
            className="p-1 rounded hover:bg-gray-800"
            title="Adicionar membro"
            aria-label="Adicionar membro"
          >
            <FiPlus className="h-6 w-6 text-blue-600" aria-hidden />
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-2">
          Clique nos membros que foram para
          {reportType === "CELULA" ? " a célula" : " o culto"}
        </p>
        <ul className="space-y-2">
          {members.map((m) => {
            const selected = !!presentMap[m.id];
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => togglePresent(m.id)}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selected
                      ? "border-green-500 bg-green-900/20"
                      : "border-gray-700"
                  } hover:shadow-sm`}
                  aria-pressed={selected}
                >
                  <span className="truncate">{m.name}</span>
                  {selected && <FiCheck className="h-5 w-5 text-green-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <button
          onClick={submit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting && (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {isSubmitting ? "Enviando..." : "Enviar Relatório"}
        </button>
      </div>

      <AddMemberChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onCreateNew={handleCreateNewMember}
        onAddExisting={handleAddExistingMember}
        currentCelulaId={selectedGroup}
      />

      <MemberModal
        member={null}
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSave={handleSaveMember}
        celulas={groups}
        initialCelulaId={selectedGroup}
      />

      <ModalConfirm
        open={showConfirmModal}
        title="Data fora do dia da célula"
        message={(() => {
          const celula = groups.find((g) => g.id === selectedGroup);
          if (
            !celula ||
            celula.weekday === null ||
            celula.weekday === undefined
          ) {
            return "Deseja confirmar esta data?";
          }
          const weekdays = [
            "Domingo",
            "Segunda-feira",
            "Terça-feira",
            "Quarta-feira",
            "Quinta-feira",
            "Sexta-feira",
            "Sábado",
          ];
          return `A célula ocorre às ${weekdays[celula.weekday]}s. Deseja mesmo criar um relatório para ${pendingDate?.format("DD/MM/YYYY")} (${weekdays[pendingDate?.day() ?? 0]})?`;
        })()}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDate}
        onCancel={handleCancelDate}
      />

      <ReportReplaceModal
        open={showReplaceModal}
        reportType={reportType}
        date={reportDate?.format("DD/MM/YYYY") || ""}
        onReplace={handleSubmitReport}
        onOtherDate={() => {
          setShowReplaceModal(false);
        }}
        onCancel={() => setShowReplaceModal(false)}
      />
    </div>
  );
}
