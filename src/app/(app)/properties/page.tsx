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
import { IconHome, IconMapPin, IconPlus } from "@/components/icons";
import { BranchRef, Paginated, Person, api, readableError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface PropertyRow {
  id: string;
  reference: string;
  propertyType: string;
  addressLine: string;
  latitude: string | null;
  longitude: string | null;
  branch: BranchRef;
  division: { id: string; name: string } | null;
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
  propertyType: string;
  addressLine: string;
  plotNumber: string;
  titleNumber: string;
  latitude: string;
  longitude: string;
}

const EMPTY_PROPERTY_FORM: PropertyFormState = {
  reference: "",
  branchId: "",
  propertyType: "Residential house",
  addressLine: "",
  plotNumber: "",
  titleNumber: "",
  latitude: "",
  longitude: "",
};

const EMPTY_INSPECTION_FORM: InspectionFormState = {
  loanReference: "",
  clientName: "",
  inspectorId: "",
  priority: "NORMAL",
  dueDate: "",
};

export default function PropertiesPage() {
  const { can } = useAuth();

  const [result, setResult] = React.useState<Paginated<PropertyRow> | null>(
    null,
  );

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

  const [form, setForm] =
    React.useState<PropertyFormState>(EMPTY_PROPERTY_FORM);

  const [inspectionForm, setInspectionForm] =
    React.useState<InspectionFormState>(EMPTY_INSPECTION_FORM);

  /*
   * Use functional state updates.
   *
   * This prevents stale-state problems when React batches multiple updates.
   */
  const setInspectionField = React.useCallback(
    (field: keyof InspectionFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;

        setInspectionForm((previous) => ({
          ...previous,
          [field]: value,
        }));
      },
    [],
  );

  const setPropertyField = React.useCallback(
    (field: keyof PropertyFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;

        setForm((previous) => ({
          ...previous,
          [field]: value,
        }));
      },
    [],
  );

  /*
   * Stable callbacks are important because Modal has effects that depend
   * on onClose.
   */
  const closeCreate = React.useCallback(() => {
    setShowCreate(false);
  }, []);

  const closeRaise = React.useCallback(() => {
    setRaiseFor(null);
  }, []);

  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced]);

  const load = React.useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });

    if (debounced.trim()) {
      params.set("search", debounced.trim());
    }

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
      api
        .get<Paginated<BranchRef>>("/branches?page=1&pageSize=100")
        .then((response) => {
          setBranches(response.data);
        })
        .catch(() => {
          setBranches([]);
        });
    }

    if (can("inspections.assign")) {
      api
        .get<Person[]>("/users/inspectors")
        .then(setInspectors)
        .catch(() => setInspectors([]));
    }
  }, [can]);

  const createProperty = async (event: React.FormEvent) => {
    event.preventDefault();

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await api.post("/properties", {
        reference: form.reference,
        branchId: form.branchId,
        propertyType: form.propertyType,
        addressLine: form.addressLine,
        plotNumber: form.plotNumber || undefined,
        titleNumber: form.titleNumber || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      });

      setNotice(`Property ${form.reference} registered.`);

      setShowCreate(false);
      setForm({ ...EMPTY_PROPERTY_FORM });

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
        loanReference: inspectionForm.loanReference,
        clientName: inspectionForm.clientName || undefined,
        inspectorId: inspectionForm.inspectorId || undefined,
        priority: inspectionForm.priority,
        dueDate: inspectionForm.dueDate
          ? new Date(inspectionForm.dueDate).toISOString()
          : undefined,
      });

      setNotice(`Inspection raised for ${raiseFor.reference}.`);

      setRaiseFor(null);
      setInspectionForm({
        ...EMPTY_INSPECTION_FORM,
      });

      await load();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Collateral registered for inspection."
        action={
          can("properties.write") ? (
            <Button
              icon={<IconPlus className="h-4 w-4" />}
              onClick={() => setShowCreate(true)}
            >
              Register property
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert
          tone="danger"
          title="Something went wrong"
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {notice && (
        <Alert
          tone="success"
          title={notice}
          onDismiss={() => setNotice(null)}
        />
      )}

      <Card className="p-4">
        <SearchInput
          placeholder="Search reference, address, plot or title number"
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
            title={
              debounced
                ? "No properties match that search"
                : "No properties yet"
            }
            description={
              debounced
                ? "Try a different reference."
                : "Register one to begin raising inspections."
            }
            action={
              can("properties.write") && !debounced ? (
                <Button onClick={() => setShowCreate(true)}>
                  Register property
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table label="Registered properties">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Address</Th>
                  <Th className="hidden lg:table-cell">Branch</Th>
                  <Th className="hidden md:table-cell">Coordinates</Th>
                  <Th align="right">Inspections</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>

              <tbody>
                {result.data.map((property) => (
                  <Tr key={property.id}>
                    <Td>
                      <span className="font-semibold text-ink">
                        {property.reference}
                      </span>

                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {property.propertyType}
                      </span>
                    </Td>

                    <Td>
                      <span className="block max-w-[260px] truncate">
                        {property.addressLine}
                      </span>

                      {property.division && (
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          {property.division.name}
                        </span>
                      )}
                    </Td>

                    <Td className="hidden text-sm text-ink-muted lg:table-cell">
                      {property.branch.code}
                    </Td>

                    <Td className="hidden md:table-cell">
                      {property.latitude ? (
                        <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-ink-muted">
                          <IconMapPin className="h-3.5 w-3.5 text-success-fg" />
                          {Number(property.latitude).toFixed(4)},{" "}
                          {Number(property.longitude).toFixed(4)}
                        </span>
                      ) : (
                        <Badge tone="warning">Not set</Badge>
                      )}
                    </Td>

                    <Td align="right" className="tabular-nums">
                      {property._count.inspections}
                    </Td>

                    <Td align="right">
                      {can("inspections.create") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setRaiseFor(property)}
                        >
                          Raise inspection
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <Pagination
              page={result.meta.page}
              totalPages={result.meta.totalPages}
              total={result.meta.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      {/* REGISTER PROPERTY MODAL */}

      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="Register property"
        description="Coordinates are optional, but without them a GPS capture cannot be verified."
        width="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeCreate}>
              Cancel
            </Button>

            <Button form="property-form" type="submit" loading={busy}>
              Register
            </Button>
          </>
        }
      >
        <form
          id="property-form"
          onSubmit={createProperty}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Reference" required htmlFor="property-reference">
            <Input
              id="property-reference"
              name="reference"
              required
              value={form.reference}
              placeholder="PROP-2026-0004"
              onChange={setPropertyField("reference")}
            />
          </Field>

          <Field label="Branch" required htmlFor="property-branch">
            <Select
              id="property-branch"
              name="branchId"
              required
              value={form.branchId}
              onChange={setPropertyField("branchId")}
            >
              <option value="">Choose a branch</option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} — {branch.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Property type" required htmlFor="property-type">
            <Input
              id="property-type"
              name="propertyType"
              required
              value={form.propertyType}
              onChange={setPropertyField("propertyType")}
            />
          </Field>

          <Field label="Plot number" htmlFor="property-plot">
            <Input
              id="property-plot"
              name="plotNumber"
              value={form.plotNumber}
              onChange={setPropertyField("plotNumber")}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Address" required htmlFor="property-address">
              <Input
                id="property-address"
                name="addressLine"
                required
                value={form.addressLine}
                onChange={setPropertyField("addressLine")}
              />
            </Field>
          </div>

          <Field label="Title number" htmlFor="property-title">
            <Input
              id="property-title"
              name="titleNumber"
              value={form.titleNumber}
              onChange={setPropertyField("titleNumber")}
            />
          </Field>

          <div />

          <Field
            label="Latitude"
            hint="e.g. -1.9536"
            htmlFor="property-latitude"
          >
            <Input
              id="property-latitude"
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={setPropertyField("latitude")}
            />
          </Field>

          <Field
            label="Longitude"
            hint="e.g. 30.0928"
            htmlFor="property-longitude"
          >
            <Input
              id="property-longitude"
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={setPropertyField("longitude")}
            />
          </Field>
        </form>
      </Modal>

      {/* RAISE INSPECTION MODAL */}

      <Modal
        open={raiseFor !== null}
        onClose={closeRaise}
        title="Raise inspection"
        description={
          raiseFor
            ? `${raiseFor.reference} — ${raiseFor.addressLine}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeRaise}>
              Cancel
            </Button>

            <Button form="inspection-form" type="submit" loading={busy}>
              Raise inspection
            </Button>
          </>
        }
      >
        <form
          id="inspection-form"
          onSubmit={raiseInspection}
          className="space-y-4"
        >
          <Field label="Loan reference" required htmlFor="inspection-loan">
            <Input
              id="inspection-loan"
              name="loanReference"
              required
              value={inspectionForm.loanReference}
              placeholder="LOAN-2026-001"
              onChange={setInspectionField("loanReference")}
            />
          </Field>

          <Field label="Client name" htmlFor="inspection-client">
            <Input
              id="inspection-client"
              name="clientName"
              value={inspectionForm.clientName}
              onChange={setInspectionField("clientName")}
            />
          </Field>

          {/* Keep this Field mounted at all times.
              Only its options change when inspectors load. */}
          <Field
            label="Assign to inspector"
            hint="Can be assigned later if left blank."
            htmlFor="inspection-inspector"
          >
            <Select
              id="inspection-inspector"
              name="inspectorId"
              value={inspectionForm.inspectorId}
              onChange={setInspectionField("inspectorId")}
              disabled={!can("inspections.assign")}
            >
              <option value="">
                {inspectors.length > 0 ? "Assign later" : "Loading inspectors…"}
              </option>

              {inspectors.map((inspector) => (
                <option key={inspector.id} value={inspector.id}>
                  {inspector.firstName} {inspector.lastName}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority" htmlFor="inspection-priority">
              <Select
                id="inspection-priority"
                name="priority"
                value={inspectionForm.priority}
                onChange={setInspectionField("priority")}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </Field>

            <Field label="Due date" htmlFor="inspection-due">
              <Input
                id="inspection-due"
                name="dueDate"
                type="date"
                value={inspectionForm.dueDate}
                onChange={setInspectionField("dueDate")}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
