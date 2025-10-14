import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
} from "react";
import ModalPortal from "../PopUp/ModalPortal.jsx";
import NewOrderForm from "./NewOrderForm";
import fetchStock from "../../../services/StockAPI";
import {
  createOrderServices,
  getOrderById,
  updateOrder,
} from "../../../services/orderServices.mjs";
import {
  buildPayloadFromForm,
  computeChanges,
  buildComparableFromOrder,
  buildFormStateFromOrder,
} from "./utils/orderPayload.js";
import { useOrderForm } from "./hooks/useOrderForm.js";
import {
  createInitialForm,
  DEFAULT_DIAL_CODE,
  formatCents,
} from "./utils/NewOrderUtils.jsx";

const NewOrderPopup = React.forwardRef(function NewOrderPopup(
  { onCreate },
  ref
) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrderInput, setEditOrderInput] = useState("");
  const [editModalError, setEditModalError] = useState("");
  const [editModalSaving, setEditModalSaving] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [originalOrderComparable, setOriginalOrderComparable] = useState(null);
  const [originalOrderMetadata, setOriginalOrderMetadata] = useState(null);

  const {
    form,
    setForm,
    handleChange,
    handleSelectProduct,
    handleShippingCostChange,
    handleAddItem,
    handleRemoveItem,
  } =
    useOrderForm({ sameAsShipping, products });

  /* ---------------------------------------------
   *  PRODUCT FETCH
   * ------------------------------------------- */
  useEffect(() => {
    if (!open || products.length) return;
    let cancelled = false;

    (async () => {
      setProductsLoading(true);
      try {
        const result = await fetchStock();
        const list = Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result)
          ? result
          : Object.values(result?.items || {});

        if (!cancelled) {
          setProducts(
            list
              .map((item) => ({
                id: String(item?.id ?? ""),
                name: item?.name ?? "",
                stockValue: Number(item?.stockValue ?? 0),
                priceInCents:
                  item?.priceInCents != null
                    ? Number(item.priceInCents)
                    : item?.priceInEuros != null
                    ? Math.round(Number(item.priceInEuros) * 100)
                    : null,
              }))
              .filter((p) => p.id && p.name)
          );
        }
      } catch (err) {
        if (!cancelled) setProductsError(err?.message || String(err));
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, products.length]);

  /* ---------------------------------------------
   *  MODAL MANAGEMENT
   * ------------------------------------------- */
  const handleOpenCreate = useCallback(() => {
    setMode("create");
    setForm(createInitialForm());
    setSameAsShipping(true);
    setOpen(true);
  }, [setForm]);

  const handleCloseForm = useCallback(() => {
    setOpen(false);
    setMode("create");
    setForm(createInitialForm());
  }, [setForm]);

  const handleOpenEditModal = useCallback(() => setEditModalOpen(true), []);
  const handleCloseEditModal = useCallback(() => setEditModalOpen(false), []);

  const handleToggleSameAs = useCallback((checked) => {
    setSameAsShipping(checked);
    if (checked) {
      setForm((prev) => ({
        ...prev,
        billing_address: { ...prev.shipping_address },
      }));
    }
  }, [setSameAsShipping, setForm]);

  const handleCustomerPhonePrefixChange = useCallback(
    (nextPrefix) => {
      setForm((prev) => {
        const safePrefix = nextPrefix || DEFAULT_DIAL_CODE;
        const nextNumber = prev.phoneNumber || "";
        const phone = nextNumber
          ? `${safePrefix} ${nextNumber}`.trim()
          : safePrefix;
        return {
          ...prev,
          phonePrefix: safePrefix,
          phone: phone.trim(),
        };
      });
    },
    [setForm]
  );

  const handleCustomerPhoneNumberChange = useCallback(
    (nextNumber) => {
      setForm((prev) => {
        const safeNumber = nextNumber || "";
        const prefix = prev.phonePrefix || DEFAULT_DIAL_CODE;
        const phone = safeNumber ? `${prefix} ${safeNumber}`.trim() : prefix;
        return {
          ...prev,
          phoneNumber: safeNumber,
          phone: phone.trim(),
        };
      });
    },
    [setForm]
  );

  /* ---------------------------------------------
   *  LOAD EXISTING ORDER
   * ------------------------------------------- */
  const loadOrderForEdit = useCallback(
    async (rawId, { viaModal = false } = {}) => {
      const trimmed = String(rawId ?? "").trim();
      if (!trimmed) throw new Error("Order ID is required.");

      if (viaModal) {
        setEditModalSaving(true);
        setEditModalError("");
      }

      try {
        const order = await getOrderById(trimmed);
        if (!order) throw new Error(`Order ${trimmed} not found.`);

        const metadata = order.metadata ?? {};
        const comparable = buildComparableFromOrder(order);
        const { form: hydratedForm, sameAsShipping: hydratedSame } =
          buildFormStateFromOrder(order);

        setEditingOrderId(order.id ?? trimmed);
        setOriginalOrderMetadata(metadata);
        setOriginalOrderComparable(comparable);
        setForm(hydratedForm);
        setSameAsShipping(hydratedSame);
        setMode("edit");
        setSubmitError("");
        setOpen(true);
        if (viaModal) {
          setEditModalOpen(false);
        }
      } catch (err) {
        if (viaModal) {
          setEditModalError(err?.message || String(err));
        }
        throw err;
      } finally {
        if (viaModal) {
          setEditModalSaving(false);
        }
      }
    },
    [
      setForm,
      setSameAsShipping,
      setMode,
      setSubmitError,
      setEditModalOpen,
      setEditModalError,
      setEditModalSaving,
      setEditingOrderId,
      setOriginalOrderMetadata,
      setOriginalOrderComparable,
    ]
  );

  const handleEditSubmit = useCallback(async () => {
    const trimmed = editOrderInput.trim();
    if (!trimmed) {
      setEditModalError("Please enter an order ID.");
      return;
    }

    try {
      await loadOrderForEdit(trimmed, { viaModal: true });
    } catch {
      /* modal errors handled inside loadOrderForEdit */
    }
  }, [editOrderInput, loadOrderForEdit, setEditModalError]);

  useImperativeHandle(
    ref,
    () => ({
      openCreate: () => {
        handleOpenCreate();
      },
      openEdit: (orderId) => loadOrderForEdit(orderId),
    }),
    [handleOpenCreate, loadOrderForEdit]
  );

  /* ---------------------------------------------
   *  SUBMIT ORDER
   * ------------------------------------------- */
  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!form?.name?.trim() || !form?.email?.trim() || !form?.phone?.trim()) {
      setSubmitError("Please fill in all customer fields (name, email, phone).");
      return;
    }

    const includeStatusDefaults = mode === "create";
    const payload = buildPayloadFromForm(form, sameAsShipping, {
      includeStatusDefaults,
      baseMetadata: mode === "edit" ? originalOrderMetadata : undefined,
    });

    setSaving(true);
    setSubmitError("");

    try {
      if (mode === "create") {
        const created = await createOrderServices(payload);
        if (!created?.id) throw new Error("Order API did not return an ID");
        onCreate?.(created);
      } else {
        if (!editingOrderId) throw new Error("No order selected.");
        const changes = computeChanges(originalOrderComparable, payload);
        if (!Object.keys(changes).length) {
          setSubmitError("No changes detected.");
          return;
        }
        const updated = await updateOrder(editingOrderId, changes);
        onCreate?.(updated);
      }
      handleCloseForm();
    } catch (err) {
      setSubmitError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    form,
    sameAsShipping,
    mode,
    originalOrderMetadata,
    originalOrderComparable,
    editingOrderId,
    onCreate,
    handleCloseForm,
  ]);

  /* ---------------------------------------------
   *  RENDER
   * ------------------------------------------- */
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
          type="button"
          className="btn btn--xl btn--ghost w-full sm:w-auto"
          onClick={handleOpenEditModal}
        >
          Edit Order
        </button>
        <button
          type="button"
          className="btn btn--xl btn--ghost w-full sm:w-auto"
          onClick={handleOpenCreate}
        >
          Create Manual Order
        </button>
      </div>

      <ModalPortal
        title={mode === "edit" ? `Edit Order ${editingOrderId ?? ""}` : "Create New Order"}
        open={open}
        onClose={handleCloseForm}
      >
        <NewOrderForm
          form={form}
          sameAsShipping={sameAsShipping}
          products={products}
          productsLoading={productsLoading}
          productsError={productsError}
          saving={saving}
          submitError={submitError}
          defaultDialCode={DEFAULT_DIAL_CODE}
          formatPrice={formatCents}
          onFieldChange={handleChange}
          onShippingCostChange={handleShippingCostChange}
          onSelectProduct={handleSelectProduct}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onToggleSameAs={handleToggleSameAs}
          onCustomerPhonePrefixChange={handleCustomerPhonePrefixChange}
          onCustomerPhoneNumberChange={handleCustomerPhoneNumberChange}
          onSubmit={handleSubmit}
          submitLabel={mode === "edit" ? "Save Changes" : "Save Order"}
          submitSavingLabel="Saving..."
        />
      </ModalPortal>

      <ModalPortal
        title="Edit Order"
        open={editModalOpen}
        onClose={handleCloseEditModal}
      >
        <div className="space-y-4">
          <label className="new-order-field new-order-field--full">
            <span className="new-order-label">Order ID</span>
            <input
              type="text"
              className="new-order-input"
              placeholder="Enter order ID"
              value={editOrderInput}
              onChange={(e) => setEditOrderInput(e.target.value)}
              disabled={editModalSaving}
            />
          </label>

          {editModalError && (
            <div className="new-order-hint new-order-hint--error">
              {editModalError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleCloseEditModal}
              disabled={editModalSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleEditSubmit}
              disabled={editModalSaving}
            >
              {editModalSaving ? "Loading..." : "Confirm"}
            </button>
          </div>
        </div>
      </ModalPortal>
    </>
  );
});

export default NewOrderPopup;
