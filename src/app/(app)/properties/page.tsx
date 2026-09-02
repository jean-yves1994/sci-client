"use client";

import * as React from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Table,
  TableSkeleton,
  Td,
  Th,
  Tr,
} from "@/components/ui";
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
  branch: BranchRef;
  _count: { inspections: number };
}

interface InspectionFormState {
  loanReference: string;
  clientName: string;
  inspectorId: string;
  priority: string;
  dueDate: string;
}

interface PropertyFormState {
  reference: string;
  branchId: string;
  name: string;
  propertyType: string;
  ownerClientName: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  villageStreet: string;
}

const PROPERTY_TYPES = [
  "Residential",
  "Commercial",
  "Industrial",
  "Agricultural",
  "Land",
  "Other",
] as const;

const EMPTY_PROPERTY_FORM: PropertyFormState = {
  reference: "",
  branchId: "",
  name: "",
  propertyType: "Residential",
  ownerClientName: "",
  province: "",
  district: "",
  sector: "",
  cell: "",
  villageStreet: "",
};

const EMPTY_INSPECTION_FORM: InspectionFormState = {
  loanReference: "",
  clientName: "",
  inspectorId: "",
  priority: "NORMAL",
  dueDate: "",
};

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
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [raiseFor, setRaiseFor] = React.useState<PropertyRow | null>(null);
  const [form, setForm] = React.useState<PropertyFormState>(EMPTY_PROPERTY_FORM);
  const [inspectionForm, setInspectionForm] = React.useState<InspectionFormState>(EMPTY_INSPECTION_FORM);
  const [debounced, setDebounced] = React.useState("");

  const setPropertyField = React.useCallback(
    (field: keyof PropertyFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((previous) => ({ ...previous, [field]: event.target.value })),
    [],
  );

  const setInspectionField = React.useCallback(
    (field: keyof InspectionFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setInspectionForm((previous) => ({ ...previous, [field]: event.target.value })),
    [],
  );

  const closeCreate = React.useCallback(() => setShowCreate(false), []);
  const closeRaise = React.useCallback(() => setRaiseFor(null), []);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => setPage(1), [debounced]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (debounced.trim()) params.set("search", debounced.trim());

    try {
      setResult(await api.get<Paginated<PropertyRow>>(`/properties?${params}`));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (can("branches.read")) {
      api.get<Paginated<BranchRef>>("/branches?page=1&pageSize=100")
        .then((response) => setBranches(response.data))
        .catch(() => setBranches([]));
    }

    if (can("inspections.assign")) {
      api.get<Person[]>("/users/inspectors")
        .then(setInspectors)
        .catch(() => setInspectors([]));
    }
  }, [can]);

  React.useEffect(() => {
    if (isInspector && user?.branchId) {
      setForm((previous) => ({ ...previous, branchId: user.branchId ?? "" }));
    }
  }, [isInspector, user?.branchId]);

  const createProperty = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const created = await api.post<PropertyRow>("/properties", {
        reference: form.reference.trim() || undefined,
        branchId: form.branchId || undefined,
        name: form.name.trim(),
        propertyType: form.propertyType,
        ownerClientName: form.ownerClientName.trim(),
        province: form.province.trim(),
        district: form.district.trim(),
        sector: form.sector.trim(),
        cell: form.cell.trim(),
        villageStreet: form.villageStreet.trim() || undefined,
      });

      setNotice(`Property ${created.reference} created successfully.`);
      setShowCreate(false);
      setForm({ ...EMPTY_PROPERTY_FORM, branchId: isInspector ? user?.branchId ?? "" : "" });
      await load();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  const raiseInspection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!raiseFor) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await api.post("/inspections", {
        propertyId: raiseFor.id,
        loanReference: inspectionForm.loanReference.trim(),
        clientName: inspectionForm.clientName.trim() || undefined,
        inspectorId: can("inspections.assign") ? inspectionForm.inspectorId || undefined : undefined,
        priority: inspectionForm.priority,
        dueDate: inspectionForm.dueDate ? new Date(inspectionForm.dueDate).toISOString() : undefined,
      });

      setNotice(isInspector
        ? `Inspection raised for ${raiseFor.reference} and assigned to you.`
        : `Inspection raised for ${raiseFor.reference}.`);
      setRaiseFor(null);
      setInspectionForm({ ...EMPTY_INSPECTION_FORM });
      await load();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  const inspectorBranch = branches.find((branch) => branch.id === user?.branchId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description={isInspector
          ? "Create basic collateral information from the field and raise inspections for your assigned branch."
          : "Basic collateral properties registered for inspection."}
        action={can("properties.write") ? (
          <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Create property
          </Button>
        ) : undefined}
      />

      {error && <Alert tone="danger" title="Something went wrong" onDismiss={() => setError(null)}>{error}</Alert>}
      {notice && <Alert tone="success" title={notice} onDismiss={() => setNotice(null)} />}

      <Card className="p-4">
        <SearchInput
          placeholder="Search reference, property name, owner or location"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search properties"
        />
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            icon={<IconHome />}
            title={debounced ? "No properties match that search" : "No properties yet"}
            description={debounced ? "Try a different reference, name or location." : "Create one to begin raising inspections."}
            action={can("properties.write") && !debounced ? (
              <Button onClick={() => setShowCreate(true)}>Create property</Button>
            ) : undefined}
          />
        ) : (
          <>
            <Table label="Registered properties">
              <thead><tr>
                <Th>Property</Th><Th>Owner / Client</Th><Th>Location</Th>
                <Th className="hidden lg:table-cell">Branch</Th>
                <Th align="right">Inspections</Th><Th align="right">Actions</Th>
              </tr></thead>
              <tbody>
                {result.data.map((property) => (
                  <Tr key={property.id}>
                    <Td>
                      <span className="font-semibold text-ink">{property.reference}</span>
                      <span className="mt-0.5 block text-sm text-ink">{property.name || "Unnamed property"}</span>
                      <span className="mt-0.5 block text-xs text-ink-faint">{property.propertyType}</span>
                    </Td>
                    <Td>{property.ownerClientName || <span className="text-ink-faint">Not provided</span>}</Td>
                    <Td>
                      <span className="block max-w-[300px] truncate">
                        {[property.district, property.sector, property.cell].filter(Boolean).join(", ") || "Location not provided"}
                      </span>
                      {property.province && <span className="mt-0.5 block text-xs text-ink-faint">{property.province}{property.villageStreet ? ` · ${property.villageStreet}` : ""}</span>}
                    </Td>
                    <Td className="hidden text-sm text-ink-muted lg:table-cell">{property.branch.code}</Td>
                    <Td align="right" className="tabular-nums">{property._count.inspections}</Td>
                    <Td align="right">{can("inspections.create") && <Button size="sm" variant="secondary" onClick={() => setRaiseFor(property)}>Raise inspection</Button>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={result.meta.page} totalPages={result.meta.totalPages} total={result.meta.total} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="Create property"
        description="Enter only the basic property information. Detailed collateral information will be captured during the inspection."
        width="lg"
        footer={<><Button variant="secondary" onClick={closeCreate}>Cancel</Button><Button form="property-form" type="submit" loading={busy}>Create property</Button></>}
      >
        <form id="property-form" onSubmit={createProperty} className="grid gap-4 sm:grid-cols-2">
          <Field label="Property reference" hint="Leave blank to generate automatically." htmlFor="property-reference">
            <Input id="property-reference" name="reference" value={form.reference} placeholder="PROP-2026-0001" onChange={setPropertyField("reference")} />
          </Field>

          {isInspector ? (
            <Field label="Branch" hint="Your assigned branch is used automatically." required htmlFor="property-branch">
              <Input id="property-branch" name="branchId" value={inspectorBranch ? `${inspectorBranch.code} — ${inspectorBranch.name}` : "Your assigned branch"} readOnly disabled />
            </Field>
          ) : (
            <Field label="Branch" required htmlFor="property-branch">
              <Select id="property-branch" name="branchId" required value={form.branchId} onChange={setPropertyField("branchId")}>
                <option value="">Choose a branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} — {branch.name}</option>)}
              </Select>
            </Field>
          )}

          <div className="sm:col-span-2">
            <Field label="Property name / description" required htmlFor="property-name">
              <Input id="property-name" name="name" required value={form.name} placeholder="Kigali Commercial Building" onChange={setPropertyField("name")} />
            </Field>
          </div>

          <Field label="Property type" required htmlFor="property-type">
            <Select id="property-type" name="propertyType" required value={form.propertyType} onChange={setPropertyField("propertyType")}>
              {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
          </Field>

          <Field label="Owner / client name" required htmlFor="property-owner">
            <Input id="property-owner" name="ownerClientName" required value={form.ownerClientName} placeholder="John Doe" onChange={setPropertyField("ownerClientName")} />
          </Field>

          <div className="sm:col-span-2 pt-2">
            <h3 className="text-sm font-semibold text-ink">Location</h3>
            <p className="mt-1 text-xs text-ink-muted">Enter the basic administrative location of the property.</p>
          </div>

          <Field label="Province" required htmlFor="property-province"><Input id="property-province" name="province" required value={form.province} placeholder="Kigali" onChange={setPropertyField("province")} /></Field>
          <Field label="District" required htmlFor="property-district"><Input id="property-district" name="district" required value={form.district} placeholder="Gasabo" onChange={setPropertyField("district")} /></Field>
          <Field label="Sector" required htmlFor="property-sector"><Input id="property-sector" name="sector" required value={form.sector} placeholder="Kimironko" onChange={setPropertyField("sector")} /></Field>
          <Field label="Cell" required htmlFor="property-cell"><Input id="property-cell" name="cell" required value={form.cell} placeholder="Nyagatovu" onChange={setPropertyField("cell")} /></Field>
          <div className="sm:col-span-2">
            <Field label="Village / Street" hint="Optional where applicable." htmlFor="property-village-street">
              <Input id="property-village-street" name="villageStreet" value={form.villageStreet} placeholder="KG 11 Ave" onChange={setPropertyField("villageStreet")} />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={raiseFor !== null}
        onClose={closeRaise}
        title="Raise inspection"
        description={raiseFor ? `${raiseFor.reference} — ${raiseFor.name || "Property"}` : undefined}
        footer={<><Button variant="secondary" onClick={closeRaise}>Cancel</Button><Button form="inspection-form" type="submit" loading={busy}>Raise inspection</Button></>}
      >
        <form id="inspection-form" onSubmit={raiseInspection} className="space-y-4">
          <Field label="Loan reference" required htmlFor="inspection-loan"><Input id="inspection-loan" name="loanReference" required value={inspectionForm.loanReference} placeholder="LOAN-2026-001" onChange={setInspectionField("loanReference")} /></Field>
          <Field label="Client name" htmlFor="inspection-client"><Input id="inspection-client" name="clientName" value={inspectionForm.clientName} onChange={setInspectionField("clientName")} /></Field>

          {can("inspections.assign") ? (
            <Field label="Assign to inspector" hint="Can be assigned later if left blank." htmlFor="inspection-inspector">
              <Select id="inspection-inspector" name="inspectorId" value={inspectionForm.inspectorId} onChange={setInspectionField("inspectorId")}>
                <option value="">{inspectors.length > 0 ? "Assign later" : "Loading inspectors…"}</option>
                {inspectors.map((inspector) => <option key={inspector.id} value={inspector.id}>{inspector.firstName} {inspector.lastName}</option>)}
              </Select>
            </Field>
          ) : isInspector ? (
            <Field label="Inspector" hint="This inspection will be assigned to you automatically." htmlFor="inspection-inspector">
              <Input id="inspection-inspector" value={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()} readOnly disabled />
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority" htmlFor="inspection-priority"><Select id="inspection-priority" name="priority" value={inspectionForm.priority} onChange={setInspectionField("priority")}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></Select></Field>
            <Field label="Due date" htmlFor="inspection-due"><Input id="inspection-due" name="dueDate" type="date" value={inspectionForm.dueDate} onChange={setInspectionField("dueDate")} /></Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
