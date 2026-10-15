import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AnimatedHomeIcon,
  AnimatedQrIcon,
  AnimatedHistoryIcon,
  AnimatedUserIcon,
  AnimatedSparklesIcon,
} from "../components/icons/animated";

describe("Animated Lucide Icons for Navbar", () => {
  it("renders AnimatedHomeIcon with SVG paths and default size", () => {
    const html = renderToStaticMarkup(<AnimatedHomeIcon size={18} />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="18"');
    expect(html).toContain('height="18"');
    expect(html).toContain("<path");
  });

  it("renders AnimatedHomeIcon with active/hovered state", () => {
    const html = renderToStaticMarkup(
      <AnimatedHomeIcon isActive={true} isHovered={true} />
    );
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
  });

  it("renders AnimatedQrIcon with 3 finder patterns and QR data lines", () => {
    const html = renderToStaticMarkup(<AnimatedQrIcon size={20} />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="20"');
    expect(html).toContain("<rect");
    expect(html).toContain("<line");
  });

  it("renders AnimatedQrIcon in active state", () => {
    const html = renderToStaticMarkup(<AnimatedQrIcon isActive={true} />);
    expect(html).toContain("<svg");
  });

  it("renders AnimatedHistoryIcon with counter-clockwise clock hands", () => {
    const html = renderToStaticMarkup(<AnimatedHistoryIcon size={18} />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="18"');
    expect(html).toContain("<line");
  });

  it("renders AnimatedHistoryIcon in active state", () => {
    const html = renderToStaticMarkup(<AnimatedHistoryIcon isActive={true} />);
    expect(html).toContain("<svg");
  });

  it("renders AnimatedUserIcon with head circle and shoulder paths", () => {
    const html = renderToStaticMarkup(<AnimatedUserIcon size={18} />);
    expect(html).toContain("<svg");
    expect(html).toContain("<circle");
    expect(html).toContain("<path");
  });

  it("renders AnimatedUserIcon in active state", () => {
    const html = renderToStaticMarkup(<AnimatedUserIcon isActive={true} />);
    expect(html).toContain("<svg");
  });

  it("renders AnimatedSparklesIcon with star polygon/path", () => {
    const html = renderToStaticMarkup(<AnimatedSparklesIcon size={14} />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="14"');
  });
});
