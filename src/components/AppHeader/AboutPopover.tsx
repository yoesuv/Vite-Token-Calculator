import { Portal, Popover } from "@chakra-ui/react";
import { LuGithub } from "react-icons/lu";
import { FaXTwitter } from "react-icons/fa6";
import { InfoIcon } from "../icons";
import "./AboutPopover.css";

/**
 * Header "About" affordance: an info pill that opens a small popover with the
 * app version, a short blurb, and links to the project's GitHub and X profiles.
 * Self-contained like ModelInfoPopover — the caller only drops it in a layout.
 */
export function AboutPopover() {
  return (
    <Popover.Root positioning={{ placement: "bottom-end" }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="about-toggle"
          aria-label="About Token Calculator"
        >
          <span className="about-toggle-icon" aria-hidden="true">
            <InfoIcon />
          </span>
          About
        </button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content className="about-pop">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body>
              <strong className="about-pop-title">Token Calculator</strong>
              <p className="about-pop-text">
                A pocket calculator for AI pricing: enter your budget in your
                local currency and see how many tokens it buys across different
                models — pricing and live FX rates come from a live model
                catalog, with an adjustable cache/input/output usage mix so the
                estimate matches how you actually use each model. Everything
                runs in your browser; no account required.
              </p>
              <p className="about-pop-version">Version {__APP_VERSION__}</p>
              <div className="about-pop-links">
                <a
                  className="about-pop-link"
                  href="https://github.com/your-org/token-calculator"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="about-pop-link-icon" aria-hidden="true">
                    <LuGithub />
                  </span>
                  GitHub
                </a>
                <a
                  className="about-pop-link"
                  href="https://x.com/yoesuv"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="about-pop-link-icon" aria-hidden="true">
                    <FaXTwitter />
                  </span>
                  X (Twitter)
                </a>
              </div>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

export default AboutPopover;
