import { Portal, Popover } from "@chakra-ui/react";
import { LuGithub } from "react-icons/lu";
import { FaXTwitter } from "react-icons/fa6";
import { SiBuymeacoffee } from "react-icons/si";
import { projectLinks } from "../../config/projectLinks";
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
              {/* Titled via Popover.Title so the dialog has an accessible
                  name (role="dialog" is unannounced without one). asChild
                  keeps the styled <strong> as the rendered element. */}
              <Popover.Title asChild>
                <strong className="about-pop-title">Token Calculator</strong>
              </Popover.Title>
              <p className="about-pop-text">
                A pocket calculator for AI pricing: enter your budget in your
                local currency and see how many tokens it buys across different
                models — pricing and live FX rates come from a live model
                catalog, with an adjustable cache/input/output usage mix so the
                estimate matches how you actually use each model. Everything
                runs in your browser; no account required.
              </p>
              <p className="about-pop-text">
                The data is collected manually from various sources and may be
                inaccurate or out of date. Please verify any pricing information
                with the official model provider before making decisions based
                on it.
              </p>
              <p className="about-pop-version">Version {__APP_VERSION__}</p>
              <div className="about-pop-links">
                <a
                  className="about-pop-link"
                  href={projectLinks.github}
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
                  href={projectLinks.x}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="about-pop-link-icon" aria-hidden="true">
                    <FaXTwitter />
                  </span>
                  X (Twitter)
                </a>
                <a
                  className="about-pop-link"
                  href={projectLinks.buyMeACoffee}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="about-pop-link-icon" aria-hidden="true">
                    <SiBuymeacoffee />
                  </span>
                  Buy me a coffee
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
