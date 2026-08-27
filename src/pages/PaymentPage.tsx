import React, { useState } from "react";

import { Order, PaymentProviderType } from "../types.ts";
import { api } from "../utils/api.ts";
import { AppLogo } from "../components/AppLogo.tsx";

import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

interface PaymentPageProps {
  order: Order;
  onPaymentSuccess: (order: Order) => void;
  onCancel: () => void;
}

interface PaymentProviderOption {
  id: PaymentProviderType;
  name: string;
  description: string;
  logo: string;
  logoClassName?: string;
  brandColor?: string;
  selectedClassName: string;
}

/**
 * ============================================================
 * OPÉRATEURS MOBILE MONEY
 * ============================================================
 *
 * Les images sont placées dans :
 *
 * public/
 * └── payment-providers/
 *     ├── mtn.jpg
 *     ├── orange.png
 *     ├── moov.png
 *     └── celtis.jpeg
 *
 * Comme elles sont dans "public", on les appelle directement
 * avec /payment-providers/...
 */
const PAYMENT_PROVIDERS: PaymentProviderOption[] = [
  {
    id: "mtn" as PaymentProviderType,
    name: "MTN Mobile Money",
    description: "Paiement Mobile Money",
    logo: "/payement-providers/mtn.jpg",
    logoClassName: "bg-amber-100 ring-1 ring-amber-400/40",
    selectedClassName:
      "border-amber-400 bg-amber-50 dark:bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]",
  },
  {
    id: "orange" as PaymentProviderType,
    name: "Orange Money",
    description: "Paiement instantané",
    logo: "/payement-providers/orange.png",
    logoClassName: "bg-orange-100 ring-1 ring-orange-400/40",
    selectedClassName:
      "border-orange-400 bg-orange-50 dark:bg-orange-500/10 shadow-[0_0_0_1px_rgba(249,115,22,0.15)]",
  },
  {
    id: "moov" as PaymentProviderType,
    name: "Moov Money",
    description: "Paiement Mobile Money",
    logo: "/payement-providers/moov.png",
    logoClassName: "bg-sky-100 ring-1 ring-sky-400/40",
    selectedClassName:
      "border-sky-400 bg-sky-50 dark:bg-sky-500/10 shadow-[0_0_0_1px_rgba(14,116,144,0.15)]",
  },
  {
    id: "celtis" as PaymentProviderType,
    name: "Celtis Money",
    description: "Paiement Mobile Money",
    logo: "/payement-providers/celtis.jpeg",
    logoClassName: "bg-[#243f78] ring-1 ring-[#243f78]/30",
    selectedClassName:
      "border-[#243f78] bg-[#243f78]/5 shadow-[0_0_0_1px_rgba(36,63,120,0.15)]",
  },
];

export const PaymentPage: React.FC<PaymentPageProps> = ({
  order,
  onPaymentSuccess,
  onCancel,
}) => {
  const [provider, setProvider] =
    useState<PaymentProviderType>("mtn");

  const [phoneNumber, setPhoneNumber] = useState(
    order.client_phone || "+229 97000000",
  );

  const [simulatedOutcome, setSimulatedOutcome] = useState<
    "success" | "failed" | "pending"
  >("success");

  const [isProcessing, setIsProcessing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [step, setStep] = useState<
    "form" | "waiting_prompt" | "failed"
  >("form");

  const selectedProvider = PAYMENT_PROVIDERS.find(
    (item) => item.id === provider,
  );

  /**
   * ============================================================
   * INITIATION DU PAIEMENT
   * ============================================================
   */
  const handleInitiatePayment = async () => {
    if (!phoneNumber.trim()) {
      setErrorMessage(
        "Veuillez renseigner votre numéro Mobile Money.",
      );
      return;
    }

    try {
      setErrorMessage("");
      setIsProcessing(true);
      setStep("waiting_prompt");

      const res = await api.post<{
        message: string;
        transaction: any;
        order: Order;
      }>("/payments/initiate", {
        order_id: order.id,
        provider,
        phone_number: phoneNumber,
        simulated_outcome: simulatedOutcome,
      });

      /**
       * Petite temporisation pour reproduire
       * l'expérience de validation Mobile Money.
       */
      setTimeout(() => {
        setIsProcessing(false);

        if (res.transaction.status === "success") {
          onPaymentSuccess(res.order);
        } else {
          setStep("failed");

          if (res.transaction.status === "failed") {
            setErrorMessage(
              "Transaction refusée : solde insuffisant ou code secret incorrect.",
            );
          } else {
            setErrorMessage(
              "Délai d’attente dépassé pour la validation USSD.",
            );
          }
        }
      }, 2200);
    } catch (err: any) {
      setIsProcessing(false);
      setStep("failed");

      setErrorMessage(
        err?.message ||
          "Erreur lors du traitement du paiement.",
      );
    }
  };

  /**
   * ============================================================
   * RETOUR AU FORMULAIRE
   * ============================================================
   */
  const handleRetry = () => {
    setErrorMessage("");
    setStep("form");
    setIsProcessing(false);
  };

  /**
   * ============================================================
   * RENDER
   * ============================================================
   */
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="
            flex items-center gap-1.5
            px-3 py-1.5
            rounded-full
            glass-card
            hover:bg-white/90 dark:hover:bg-white/10
            text-xs
            font-semibold
            text-ink
            transition-all
            border border-black/5 dark:border-white/10
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Annuler</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-medium">
          <Lock className="w-3.5 h-3.5" />
          <span>Session Sécurisée</span>
        </div>
      </div>

      {/* ========================================================
          MAIN PAYMENT CARD
      ======================================================== */}

      <div
        className="
          glass-panel
          rounded-3xl
          p-6
          sm:p-8
          border border-white/60 dark:border-white/10
          shadow-2xl
          space-y-6
          relative
          overflow-hidden
        "
      >

        {/* Décorations */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-violet/5 blur-3xl pointer-events-none" />

        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

        {/* ======================================================
            ORDER SUMMARY
        ====================================================== */}

        <div className="text-center pb-5 border-b border-black/5 dark:border-white/10 relative">

          <AppLogo
            size="sm"
            showText={false}
            className="mx-auto mb-2"
          />

          <span className="text-[11px] font-mono uppercase text-ink/60">
            Règlement Commande #{order.order_number}
          </span>

          <h1 className="font-serif font-bold text-xl sm:text-2xl text-ink mt-1">
            {order.service_name}
          </h1>

          <div
            className="
              mt-3
              inline-block
              px-4
              py-1.5
              rounded-full
              bg-violet/10
              border border-violet/20
              font-mono
              text-2xl
              font-bold
              text-violet
            "
          >
            {order.amount.toLocaleString()} {order.currency}
          </div>
        </div>

        {/* ======================================================
            PAYMENT FORM
        ====================================================== */}

        {step === "form" && (
          <div className="space-y-5 relative">

            {/* ==================================================
                1. PAYMENT PROVIDERS
            ================================================== */}

            <div>
              <label className="block text-xs font-medium text-ink mb-2">
                Choisissez votre opérateur Mobile Money :
              </label>

              <div className="grid grid-cols-2 gap-3">

                {PAYMENT_PROVIDERS.map((item) => {
                  const isSelected = provider === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProvider(item.id)}
                      disabled={isProcessing}
                      className={`
                        group
                        relative
                        p-4
                        rounded-2xl
                        border
                        transition-all
                        duration-200
                        text-left
                        flex
                        flex-col
                        justify-between
                        min-h-[128px]

                        disabled:opacity-60
                        disabled:cursor-not-allowed

                        ${
                          isSelected
                            ? item.selectedClassName
                            : `
                              glass-card
                              border-black/5 dark:border-white/10
                              hover:bg-white/90 dark:hover:bg-white/10
                              hover:-translate-y-0.5
                              hover:shadow-md
                            `
                        }
                      `}
                    >

                      {/* Indicateur sélectionné */}
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2
                            className="w-4 h-4"
                            style={{
                              color: item.brandColor,
                            }}
                          />
                        </div>
                      )}

                      {/* ==================================================
                          LOGO RÉEL
                      ================================================== */}

                      <div className="flex items-center mb-3">

                        <div
                          className="
                            w-11
                            h-11
                            rounded-xl
                            flex
                            items-center
                            justify-center
                            overflow-hidden
                            bg-white
                            border
                            border-black/5
                            shadow-sm
                          "
                        >
                          <img
                            src={item.logo}
                            alt={item.name}
                            className="
                              w-full
                              h-full
                              object-contain
                              p-0.5
                            "
                            loading="eager"
                          />
                        </div>

                      </div>

                      {/* Informations */}
                      <div>
                        <span className="font-serif font-bold text-xs text-ink block">
                          {item.name}
                        </span>

                        <span className="text-[10px] text-ink/60 font-mono">
                          {item.description}
                        </span>
                      </div>

                    </button>
                  );
                })}

              </div>
            </div>

            {/* ==================================================
                2. PHONE NUMBER
            ================================================== */}

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Numéro de compte{" "}
                {selectedProvider?.name || "Mobile Money"} à
                débiter :
              </label>

              <div className="relative">

                <Smartphone
                  className="
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                    w-4
                    h-4
                    text-ink/40
                  "
                />

                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(e.target.value)
                  }
                  placeholder="+229 97000000"
                  disabled={isProcessing}
                  className="
                    w-full
                    pl-10
                    pr-3
                    py-2.5
                    rounded-xl
                    bg-white/70 dark:bg-white/10
                    border
                    border-black/10 dark:border-white/10
                    text-sm
                    font-mono
                    text-ink
                    focus:outline-none
                    focus:ring-2
                    focus:ring-violet/20
                    disabled:opacity-60
                  "
                />

              </div>
            </div>

            {/* ==================================================
                3. DEMO SIMULATOR
            ================================================== */}

            <div
              className="
                p-3.5
                rounded-2xl
                bg-black/5 dark:bg-white/5
                border border-black/5 dark:border-white/10
                space-y-2
              "
            >

              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">

                <Zap className="w-3.5 h-3.5 text-gold-brand" />

                <span>
                  Simulateur de validation

                  <span className="text-ink/50 font-normal">
                    {" "}
                    (Environnement Démo)
                  </span>
                </span>

              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium">

                {/* SUCCÈS */}
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedOutcome("success")
                  }
                  disabled={isProcessing}
                  className={`
                    py-1.5
                    px-2
                    rounded-lg
                    text-center
                    transition-all

                    ${
                      simulatedOutcome === "success"
                        ? "bg-emerald-600 text-white font-bold shadow-sm"
                        : "bg-white/60 dark:bg-white/10 text-ink/70 hover:bg-white dark:hover:bg-white/20"
                    }
                  `}
                >
                  ✓ Succès
                </button>

                {/* ÉCHEC */}
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedOutcome("failed")
                  }
                  disabled={isProcessing}
                  className={`
                    py-1.5
                    px-2
                    rounded-lg
                    text-center
                    transition-all

                    ${
                      simulatedOutcome === "failed"
                        ? "bg-red-600 text-white font-bold shadow-sm"
                        : "bg-white/60 dark:bg-white/10 text-ink/70 hover:bg-white dark:hover:bg-white/20"
                    }
                  `}
                >
                  ✗ Échec
                </button>

                {/* ATTENTE */}
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedOutcome("pending")
                  }
                  disabled={isProcessing}
                  className={`
                    py-1.5
                    px-2
                    rounded-lg
                    text-center
                    transition-all

                    ${
                      simulatedOutcome === "pending"
                        ? "bg-amber-600 text-white font-bold shadow-sm"
                        : "bg-white/60 dark:bg-white/10 text-ink/70 hover:bg-white dark:hover:bg-white/20"
                    }
                  `}
                >
                  ⏳ Attente
                </button>

              </div>
            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">

                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />

                <p className="text-xs text-red-700 dark:text-red-400">
                  {errorMessage}
                </p>

              </div>
            )}

            {/* ==================================================
                PAY BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={handleInitiatePayment}
              disabled={
                isProcessing || !phoneNumber.trim()
              }
              className="
                btn-festive
                w-full
                py-3.5
                text-sm
                sm:text-base
                flex
                items-center
                justify-center
                gap-2
                shadow-xl
                shadow-rose-brand/25
                disabled:opacity-60
                disabled:cursor-not-allowed
              "
            >
              <span>
                Payer {order.amount.toLocaleString()}{" "}
                {order.currency}
              </span>

              <ChevronRight className="w-4 h-4" />
            </button>

          </div>
        )}

        {/* ======================================================
            WAITING FOR USSD
        ====================================================== */}

        {step === "waiting_prompt" && (
          <div className="py-6 text-center space-y-5 animate-in fade-in relative">

            {/* Téléphone animé */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">

              <div className="absolute inset-0 rounded-full border-4 border-violet/20 animate-ping" />

              <div className="absolute inset-1 rounded-full border border-violet/20 animate-pulse" />

              <div className="w-14 h-14 rounded-full bg-violet text-white flex items-center justify-center shadow-lg relative z-10">
                <Smartphone className="w-7 h-7 animate-bounce" />
              </div>

            </div>

            <div>

              <h3 className="font-serif font-bold text-lg text-ink">
                Demande envoyée
              </h3>

              <p className="text-xs sm:text-sm text-ink/75 max-w-xs mx-auto mt-2 font-sans">
                Une demande de paiement a été envoyée sur votre téléphone :
              </p>

              <div className="mt-2 inline-flex items-center px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">

                <span className="font-mono text-sm font-semibold text-ink">
                  {phoneNumber}
                </span>

              </div>

              <p className="text-xs text-ink/60 max-w-sm mx-auto mt-3">
                Saisissez votre code PIN secret sur votre téléphone
                pour autoriser le paiement.
              </p>

            </div>

            {/* Opérateur sélectionné */}
            {selectedProvider && (
              <div className="flex items-center justify-center gap-2">

                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-black/5 shadow-sm">

                  <img
                    src={selectedProvider.logo}
                    alt={selectedProvider.name}
                    className="w-full h-full object-contain p-0.5"
                  />

                </div>

                <span className="text-xs font-semibold text-ink">
                  {selectedProvider.name}
                </span>

              </div>
            )}

            {/* Status réseau */}
            <div
              className="
                inline-flex
                items-center
                gap-2
                text-xs
                font-mono
                text-violet
                font-semibold
                bg-violet/10
                px-3.5
                py-1.5
                rounded-full
              "
            >

              <span className="w-2 h-2 rounded-full bg-violet animate-pulse" />

              <span>
                Attente de la confirmation réseau...
              </span>

            </div>

            {isProcessing && (
              <p className="text-[10px] text-ink/40 font-mono">
                Traitement sécurisé en cours...
              </p>
            )}

          </div>
        )}

        {/* ======================================================
            FAILED
        ====================================================== */}

        {step === "failed" && (
          <div className="py-4 text-center space-y-5 animate-in fade-in">

            <div
              className="
                w-16
                h-16
                rounded-full
                bg-red-500/10
                text-red-600
                flex
                items-center
                justify-center
                mx-auto
              "
            >
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>

              <h3 className="font-serif font-bold text-lg text-ink">
                Paiement non finalisé
              </h3>

              <p className="text-xs text-red-600 mt-2 max-w-xs mx-auto">
                {errorMessage}
              </p>

            </div>

            <div className="flex gap-3 pt-2">

              <button
                type="button"
                onClick={handleRetry}
                className="
                  btn-festive
                  w-full
                  py-2.5
                  text-xs
                "
              >
                Réessayer le paiement
              </button>

            </div>

          </div>
        )}

      </div>

      {/* ========================================================
          SECURITY FOOTER
      ======================================================== */}

      <div
        className="
          flex
          flex-wrap
          items-center
          justify-center
          gap-3
          sm:gap-4
          text-xs
          text-ink/60
          font-mono
        "
      >

        <div className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Transaction sécurisée</span>
        </div>

        <span>•</span>

        <div className="flex items-center gap-1">
          <Lock className="w-4 h-4 text-violet" />
          <span>Cryptage 256-bit</span>
        </div>

      </div>

    </div>
  );
};