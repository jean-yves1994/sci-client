"use client";

import * as React from "react";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Table, TableSkeleton, Td, Th, Tr } from "@/components/ui";
import { IconHome, IconPlus } from "@/components/icons";
import { BranchRef, Paginated, Person, api, readableError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface PropertyRow {
  id: string;
  reference: string;
  name: string | null;
  propertyType: string;
  ownerClientName: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  villageStreet: string | null;
  titleNumber: string | null;
  branch: BranchRef;
  _count: { inspections: number };
}
interface InspectionFormState { loanReference: string; clientName: string; inspectorId: string; priority: string; dueDate: string; }
interface PropertyFormState { branchId: string; name: string; propertyType: string; ownerClientName: string; titleNumber: string; province: string; district: string; sector: string; cell: string; villageStreet: string; }

const PROPERTY_TYPES = ["Residential", "Commercial", "Industrial", "Agricultural", "Land", "Other"] as const;
const EMPTY_PROPERTY_FORM: PropertyFormState = { branchId: "", name: "", propertyType: "Residential", ownerClientName: "", titleNumber: "", province: "", district: "", sector: "", cell: "", villageStreet: "" };
const EMPTY_INSPECTION_FORM: InspectionFormState = { loanReference: "", clientName: "", inspectorId: "", priority: "NORMAL", dueDate: "" };

export default function PropertiesPage() {
  const { can, user } = useAuth();
  const isInspector = user?.roles.includes("INSPECTOR") ?? false;
  const [result, setResult] = React.useState<Paginated<PropertyRow> | null>(null);
  const [branches, setBranches] = React.useState<BranchRef[]>([]);
  const [inspectors, setInspectors] = React.useState<Person[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [raiseFor, setRaiseFor] = React.useState<PropertyRow | null>(null);
  const [form, setForm] = React.useState<PropertyFormState>(EMPTY_PROPERTY_FORM);
  const [inspectionForm, setInspectionForm] = React.useState<InspectionFormState>(EMPTY_INSPECTION_FORM);

  React.useEffect(() => { const timer = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(timer); }, [search]);
  React.useEffect(() => setPage(1), [debounced]);
  React.useEffect(() => { if (isInspector && user?.branchId) setForm((p) => ({ ...p, branchId: user.branchId ?? "" })); }, [isInspector, user?.branchId]);
  React.useEffect(() => {
    if (can("branches.read")) api.get<Paginated<BranchRef>>("/branches?page=1&pageSize=100").then((r) => setBranches(r.data)).catch(() => setBranches([]));
    if (can("inspections.assign")) api.get<Person[]>("/users/inspectors").then(setInspectors).catch(() => setInspectors([]));
  }, [can]);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const p = new URLSearchParams({ page: String(page), pageSize: "20" }); if (debounced.trim()) p.set("search", debounced.trim()); setResult(await api.get<Paginated<PropertyRow>>(`/properties?${p}`)); }
    catch (e) { setError(readableError(e)); } finally { setLoading(false); }
  }, [page, debounced]);
  React.useEffect(() => { void load(); }, [load]);

  const setPropertyField = (field: keyof PropertyFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setInspectionField = (field: keyof InspectionFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setInspectionForm((p) => ({ ...p, [field]: e.target.value }));
  const inspectorBranch = branches.find((b) => b.id === user?.branchId);

  const createProperty = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null);
    try {
      const created = await api.post<PropertyRow>("/properties", {
        branchId: form.branchId || undefined,
        name: form.name.trim(), propertyType: form.propertyType, ownerClientName: form.ownerClientName.trim(),
        titleNumber: form.titleNumber.trim(), province: form.province.trim(), district: form.district.trim(),
        sector: form.sector.trim(), cell: form.cell.trim(), villageStreet: form.villageStreet.trim() || undefined,
      });
      setNotice(`Property ${created.reference} created successfully.`); setShowCreate(false); setForm({ ...EMPTY_PROPERTY_FORM, branchId: isInspector ? user?.branchId ?? "" : "" }); await load();
    } catch (e) { setError(readableError(e)); } finally { setBusy(false); }
  };

  const raiseInspection = async (event: React.FormEvent) => {
    event.preventDefault(); if (!raiseFor) return; setBusy(true); setError(null); setNotice(null);
    try {
      await api.post("/inspections", { propertyId: raiseFor.id, loanReference: inspectionForm.loanReference.trim(), clientName: inspectionForm.clientName.trim() || undefined, inspectorId: can("inspections.assign") ? inspectionForm.inspectorId || undefined : undefined, priority: inspectionForm.priority, dueDate: inspectionForm.dueDate ? new Date(inspectionForm.dueDate).toISOString() : undefined });
      setNotice(isInspector ? `Inspection raised for ${raiseFor.reference} and assigned to you.` : `Inspection raised for ${raiseFor.reference}.`); setRaiseFor(null); setInspectionForm(EMPTY_INSPECTION_FORM); await load();
    } catch (e) { setError(readableError(e)); } finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <PageHeader title="Properties" description={isInspector ? "Register collateral from the field and raise inspections." : "Collateral properties registered for inspection."} action={can("properties.write") ? <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Create property</Button> : undefined} />
    {error && <Alert tone="danger" title="Something went wrong" onDismiss={() => setError(null)}>{error}</Alert>}
    {notice && <Alert tone="success" title={notice} onDismiss={() => setNotice(null)} />}
    <Card className="p-4"><SearchInput placeholder="Search reference, owner, UPI or location" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search properties" /></Card>
    <Card>{loading ? <TableSkeleton rows={6} columns={6} /> : !result || result.data.length === 0 ? <EmptyState icon={<IconHome />} title={debounced ? "No properties match that search" : "No properties yet"} description={debounced ? "Try another search." : "Create a property to begin an inspection."} action={can("properties.write") && !debounced ? <Button onClick={() => setShowCreate(true)}>Create property</Button> : undefined} /> : <><Table label="Registered properties"><thead><tr><Th>Property</Th><Th>Owner / Client</Th><Th>Location</Th><Th>UPI</Th><Th className="hidden lg:table-cell">Branch</Th><Th align="right">Inspections</Th><Th align="right">Actions</Th></tr></thead><tbody>{result.data.map((p) => <Tr key={p.id}><Td><span className="font-semibold text-ink">{p.reference}</span><span className="mt-0.5 block text-sm text-ink">{p.name || "Unnamed property"}</span><span className="mt-0.5 block text-xs text-ink-faint">{p.propertyType}</span></Td><Td>{p.ownerClientName || <span className="text-ink-faint">Not provided</span>}</Td><Td><span className="block max-w-[260px] truncate">{[p.district, p.sector, p.cell].filter(Boolean).join(", ") || "Location not provided"}</span>{p.province && <span className="mt-0.5 block text-xs text-ink-faint">{p.province}{p.villageStreet ? ` · ${p.villageStreet}` : ""}</span>}</Td><Td className="font-mono text-xs">{p.titleNumber || "—"}</Td><Td className="hidden text-sm text-ink-muted lg:table-cell">{p.branch.code}</Td><Td align="right" className="tabular-nums">{p._count.inspections}</Td><Td align="right">{can("inspections.create") && <Button size="sm" variant="secondary" onClick={() => setRaiseFor(p)}>Raise inspection</Button>}</Td></Tr>)}</tbody></Table><Pagination page={result.meta.page} totalPages={result.meta.totalPages} total={result.meta.total} onChange={setPage} /></>}</Card>

    <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create property" description="UPI is the only land identifier. Property reference is generated automatically from the owner name and creation date." width="lg" footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button form="property-form" type="submit" loading={busy}>Create property</Button></>}>
      <form id="property-form" onSubmit={createProperty} className="grid gap-4 sm:grid-cols-2">
        {isInspector ? <Field label="Branch" hint="Your assigned branch is used automatically." required htmlFor="property-branch"><Input id="property-branch" value={inspectorBranch ? `${inspectorBranch.code} — ${inspectorBranch.name}` : "Your assigned branch"} readOnly disabled /></Field> : <Field label="Branch" required htmlFor="property-branch"><Select id="property-branch" required value={form.branchId} onChange={setPropertyField("branchId")}><option value="">Choose a branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}</Select></Field>}
        <Field label="Owner / client name" required htmlFor="property-owner"><Input id="property-owner" required value={form.ownerClientName} placeholder="John Doe" onChange={setPropertyField("ownerClientName")} /></Field>
        <div className="sm:col-span-2"><Field label="Property name / description" required htmlFor="property-name"><Input id="property-name" required value={form.name} placeholder="Kigali Commercial Building" onChange={setPropertyField("name")} /></Field></div>
        <Field label="Property type" required htmlFor="property-type"><Select id="property-type" required value={form.propertyType} onChange={setPropertyField("propertyType")}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
        <Field label="UPI" hint="Required unique parcel identifier." required htmlFor="property-upi"><Input id="property-upi" required value={form.titleNumber} placeholder="1/03/07/04/1234" onChange={setPropertyField("titleNumber")} /></Field>
        <div className="sm:col-span-2 rounded-xl bg-surface-2 p-3 text-sm text-ink-muted"><strong className="text-ink">Property reference</strong> is generated automatically as <span className="font-mono">OWNER-YYYY-MM-DD</span>. It is not entered manually.</div>
        <div className="sm:col-span-2 pt-2"><h3 className="text-sm font-semibold text-ink">Administrative location</h3><p className="mt-1 text-xs text-ink-muted">UPI does not determine the location. Enter these fields manually.</p></div>
        <Field label="Province" required htmlFor="property-province"><Input id="property-province" required value={form.province} onChange={setPropertyField("province")} /></Field>
        <Field label="District" required htmlFor="property-district"><Input id="property-district" required value={form.district} onChange={setPropertyField("district")} /></Field>
        <Field label="Sector" required htmlFor="property-sector"><Input id="property-sector" required value={form.sector} onChange={setPropertyField("sector")} /></Field>
        <Field label="Cell" required htmlFor="property-cell"><Input id="property-cell" required value={form.cell} onChange={setPropertyField("cell")} /></Field>
        <div className="sm:col-span-2"><Field label="Village / Street" htmlFor="property-village"><Input id="property-village" value={form.villageStreet} onChange={setPropertyField("villageStreet")} /></Field></div>
      </form>
    </Modal>

    <Modal open={Boolean(raiseFor)} onClose={() => setRaiseFor(null)} title="Raise inspection" description={raiseFor ? `${raiseFor.reference} · ${raiseFor.name || "Property"}` : ""} footer={<><Button variant="secondary" onClick={() => setRaiseFor(null)}>Cancel</Button><Button form="inspection-form" type="submit" loading={busy}>Raise inspection</Button></>}>
      <form id="inspection-form" onSubmit={raiseInspection} className="space-y-4"><Field label="Loan reference" required htmlFor="loan-reference"><Input id="loan-reference" required value={inspectionForm.loanReference} onChange={setInspectionField("loanReference")} /></Field><Field label="Client name" htmlFor="client-name"><Input id="client-name" value={inspectionForm.clientName} onChange={setInspectionField("clientName")} /></Field>{can("inspections.assign") && <Field label="Inspector" htmlFor="inspector"><Select id="inspector" value={inspectionForm.inspectorId} onChange={setInspectionField("inspectorId")}><option value="">Unassigned</option>{inspectors.map((i) => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}</Select></Field>}</form>
    </Modal>
  </div>;
}
