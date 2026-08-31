import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReact = vi.hoisted(() => ({
  hookIndex: 0,
  setters: [] as Array<(value: unknown) => void>,
  values: [] as unknown[],
  refresh: vi.fn(),
}));

vi.mock("react", () => ({
  useState: (initialValue: unknown) => {
    const stateIndex = mockReact.hookIndex++;
    const setState = vi.fn();
    mockReact.setters.push(setState);
    const value = mockReact.values[stateIndex];
    return [value === undefined ? initialValue : value, setState];
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockReact.refresh }),
}));

import { AssignmentsManager } from "../src/components/admin/AssignmentsManager";

type ElementLike = {
  type: unknown;
  props: Record<string, unknown>;
};

const caregiver = {
  id: "caregiver-1",
  name: "Ana Cuidadora",
  email: "ana@example.com",
  password_hash: "",
  role: "cuidador" as const,
  phone: null,
  session_version: 1,
  deleted_at: null,
  created_at: "2026-08-01T00:00:00.000Z",
};

const assignment = {
  id: "assignment-1",
  patient_id: "patient-1",
  caregiver_user_id: caregiver.id,
  start_date: "2026-08-31",
  end_date: null,
  active: 1,
  created_at: "2026-08-31T00:00:00.000Z",
  caregiverName: caregiver.name,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function response(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function findElements(node: unknown): ElementLike[] {
  if (Array.isArray(node)) return node.flatMap(findElements);
  if (!node || typeof node !== "object") return [];

  const element = node as Partial<ElementLike>;
  if (!element.props) return [];

  return [element as ElementLike, ...findElements(element.props.children)];
}

function resetMocks(): void {
  mockReact.hookIndex = 0;
  mockReact.setters.length = 0;
  mockReact.values.length = 0;
  mockReact.refresh.mockReset();
}

function createManager(overrides: Partial<Parameters<typeof AssignmentsManager>[0]> = {}) {
  resetMocks();
  return AssignmentsManager({
    patientId: "patient-1",
    assignments: [],
    caregivers: [caregiver],
    ...overrides,
  });
}

function createFormDataMock() {
  const data = new globalThis.FormData();
  data.set("caregiver_user_id", caregiver.id);
  data.set("start_date", "2026-08-31");

  const constructor = vi.fn(function FormDataMock() {
    return data;
  });
  vi.stubGlobal("FormData", constructor);
  return data;
}

function submitHandler(tree: unknown) {
  const form = findElements(tree).find((element) => element.type === "form");
  if (!form) throw new Error("Formulário de vínculo não encontrado.");
  return form.props.onSubmit as (event: { preventDefault: () => void; currentTarget: HTMLFormElement | null }) => Promise<void>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  resetMocks();
});

describe("AssignmentsManager", () => {
  it("mantém a referência do formulário durante o await e confirma o vínculo", async () => {
    const data = createFormDataMock();
    const fetchMock = vi.fn<typeof fetch>();
    const request = deferred<Response>();
    fetchMock.mockReturnValue(request.promise);
    vi.stubGlobal("fetch", fetchMock);

    const reset = vi.fn();
    const form = { reset } as unknown as HTMLFormElement;
    const handler = submitHandler(createManager());
    const event = {
      preventDefault: vi.fn(),
      currentTarget: form as HTMLFormElement | null,
    };

    const submission = handler(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(mockReact.setters[0]).toHaveBeenCalledWith(true);
    expect(mockReact.setters[1]).toHaveBeenCalledWith(null);
    expect(mockReact.setters[2]).toHaveBeenCalledWith(null);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: "patient-1",
        caregiver_user_id: data.get("caregiver_user_id"),
        start_date: data.get("start_date"),
      }),
    });

    event.currentTarget = null;
    request.resolve(response(true, { ok: true, id: "assignment-1" }));
    await submission;

    expect(reset).toHaveBeenCalledOnce();
    expect(mockReact.refresh).toHaveBeenCalledOnce();
    expect(mockReact.setters[2]).toHaveBeenLastCalledWith("Cuidador vinculado com sucesso.");
    expect(mockReact.setters[0]).toHaveBeenLastCalledWith(false);
    expect(mockReact.setters[1]).not.toHaveBeenCalledWith(expect.stringContaining("Cannot read properties"));
  });

  it("preserva erros da API, não reseta o formulário e encerra o loading", async () => {
    createFormDataMock();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(false, { error: "Cuidador já está vinculado." }));
    vi.stubGlobal("fetch", fetchMock);

    const reset = vi.fn();
    const form = { reset } as unknown as HTMLFormElement;
    const handler = submitHandler(createManager());

    await handler({ preventDefault: vi.fn(), currentTarget: form });

    expect(reset).not.toHaveBeenCalled();
    expect(mockReact.refresh).not.toHaveBeenCalled();
    expect(mockReact.setters[1]).toHaveBeenLastCalledWith("Cuidador já está vinculado.");
    expect(mockReact.setters[2]).toHaveBeenLastCalledWith(null);
    expect(mockReact.setters[0]).toHaveBeenLastCalledWith(false);
  });

  it("limpa o feedback anterior em uma nova tentativa", async () => {
    createFormDataMock();
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValueOnce(response(true, { ok: true, id: "assignment-1" }));
    fetchMock.mockResolvedValueOnce(response(false, { error: "Não foi possível vincular." }));
    vi.stubGlobal("fetch", fetchMock);

    const form = { reset: vi.fn() } as unknown as HTMLFormElement;
    const handler = submitHandler(createManager());
    const event = { preventDefault: vi.fn(), currentTarget: form };

    await handler(event);
    await handler(event);

    expect(mockReact.setters[2]).toHaveBeenLastCalledWith(null);
    expect(mockReact.setters[1]).toHaveBeenLastCalledWith("Não foi possível vincular.");
    expect(mockReact.setters[0]).toHaveBeenLastCalledWith(false);
  });

  it("mantém a ação de encerrar vínculo e confirma seu sucesso", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(true, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const tree = createManager({ assignments: [assignment], caregivers: [caregiver] });
    const deactivateButton = findElements(tree).find((element) => element.props.children === "Encerrar vínculo");
    if (!deactivateButton) throw new Error("Ação de encerramento não encontrada.");

    await (deactivateButton.props.onClick as () => Promise<void>)();

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/assignments/assignment-1", { method: "PATCH" });
    expect(mockReact.refresh).toHaveBeenCalledOnce();
    expect(mockReact.setters[2]).toHaveBeenLastCalledWith("Vínculo encerrado com sucesso.");
    expect(mockReact.setters[0]).toHaveBeenLastCalledWith(false);
  });

  it("expõe feedbacks estáveis com live regions apropriadas", () => {
    const tree = createManager();
    const elements = findElements(tree);
    const status = elements.find((element) => element.props.role === "status");
    const alert = elements.find((element) => element.props.role === "alert");

    expect(status?.props["aria-live"]).toBe("polite");
    expect(status?.props["aria-atomic"]).toBe("true");
    expect(alert?.props["aria-live"]).toBe("assertive");
    expect(alert?.props["aria-atomic"]).toBe("true");
  });
});
