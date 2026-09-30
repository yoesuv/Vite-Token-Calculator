import { useEffect, useMemo, useState } from "react";
import { Box, Skeleton, Text, VisuallyHidden } from "@chakra-ui/react";
import { CheckIcon, PlusIcon, SearchIcon, XIcon } from "../icons";
import { describeError, fetchAiModels, type ApiModel } from "../../lib/models";
import { ProviderMark } from "./ProviderMark";
import "./ModelPickerSection.css";

/** Display shape for the picker, derived from an API model. */
type PickerModel = {
  id: string;
  name: string;
  fullName: string;
  provider: string;
};

/** `moonshotai/kimi-k3` → provider `moonshotai`, display name `Kimi K3`, full name kept for search/subtitle. */
const toPickerModel = (model: ApiModel): PickerModel => {
  const separator = model.name.indexOf("/");
  const provider = separator > 0 ? model.name.slice(0, separator) : "other";
  const slug = separator > 0 ? model.name.slice(separator + 1) : model.name;
  return {
    id: model.id,
    name: slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    fullName: model.name,
    provider,
  };
};

export function ModelPickerSection() {
  const [models, setModels] = useState<PickerModel[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  // Bumped by the retry button to re-run the fetch effect.
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAiModels()
      .then((apiModels) => {
        if (cancelled) return;
        // Sort by the original API name (asc); the prettified display name can reorder items.
        const next = [...apiModels]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(toPickerModel);
        setModels(next);
        // One model pre-selected once data arrives, mirroring the old catalog default.
        setSelected((current) =>
          current.length > 0 ? current : next.length > 0 ? [next[0].id] : [],
        );
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(describeError(error));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return models.filter((model) =>
      `${model.name} ${model.fullName} ${model.provider}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [models, query]);

  const toggleModel = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 5
          ? [...current, id]
          : current,
    );
  };

  // Initial state is already 'loading'; retries re-set it here (event handler, not effect).
  const retryFetch = () => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  };

  const modelById = (id: string | undefined) =>
    models.find((item) => item.id === id);

  return (
    <Box
      as="section"
      className="picker-section"
      aria-labelledby="picker-title"
      aria-busy={status === "loading"}
    >
      <div className="picker-intro">
        <div>
          <Text id="picker-title" className="picker-title">
            Choose model
          </Text>
          <Text className="picker-description">
            Compare up to five models using the same balance and usage mix.
          </Text>
        </div>
        <div className="picker-slots" aria-label="Selected models">
          {Array.from({ length: 5 }, (_, slot) => {
            const model = modelById(selected[slot]);
            return model ? (
              <button
                className="picker-slot picker-slot-selected"
                key={slot}
                onClick={() => toggleModel(model.id)}
                aria-label={`Remove ${model.name}`}
              >
                <ProviderMark provider={model.provider} />
                <span className="picker-slot-copy">
                  <strong>{model.name}</strong>
                  <small>{model.fullName}</small>
                </span>
              </button>
            ) : (
              <button
                className="picker-slot picker-slot-empty"
                key={slot}
                onClick={() => {
                  if (visibleModels[0]) toggleModel(visibleModels[0].id);
                }}
              >
                <span className="picker-plus">
                  <PlusIcon />
                </span>
                <span>Add model</span>
              </button>
            );
          })}
        </div>
      </div>
      <label className="picker-search">
        <SearchIcon aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search models"
          aria-label="Search models"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <XIcon />
          </button>
        )}
      </label>
      <div className="picker-grid" role="list" aria-label="Available models">
        {status === "loading" && (
          <>
            <VisuallyHidden role="status">Loading models…</VisuallyHidden>
            {Array.from({ length: 8 }, (_, index) => (
              <div className="picker-skeleton" key={index}>
                <Skeleton h="100%" w="100%" borderRadius="11px" />
              </div>
            ))}
          </>
        )}
        {status === "error" && (
          <p className="picker-status" role="alert">
            {errorMessage}
            <button type="button" className="picker-retry" onClick={retryFetch}>
              Try again
            </button>
          </p>
        )}
        {status === "ready" &&
          visibleModels.map((model) => {
            const isSelected = selected.includes(model.id);
            return (
              <button
                role="listitem"
                aria-pressed={isSelected}
                className={`picker-model ${isSelected ? "is-selected" : ""}`}
                key={model.id}
                onClick={() => toggleModel(model.id)}
              >
                <ProviderMark provider={model.provider} />
                <span className="picker-model-copy">
                  <strong>{model.name}</strong>
                  <small>{model.fullName}</small>
                </span>
                {isSelected && (
                  <span className="picker-check">
                    <CheckIcon />
                  </span>
                )}
              </button>
            );
          })}
        {status === "ready" &&
          visibleModels.length === 0 &&
          models.length > 0 && (
            <p className="picker-empty">No models match “{query}”.</p>
          )}
        {status === "ready" && models.length === 0 && (
          <p className="picker-empty">No models available yet.</p>
        )}
      </div>
      {selected.length >= 5 && (
        <p className="picker-limit">
          Five models selected. Remove one to compare another.
        </p>
      )}
    </Box>
  );
}

export default ModelPickerSection;
