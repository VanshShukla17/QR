import { describe, it, expect } from "vitest";
import {
  formatVoiceScript,
  SUPPORTED_VOICE_LANGUAGES,
  VERDICT_DISPLAY_LABELS,
  VoiceVerdictType,
  VoiceLanguageCode,
  assertSarvamVoiceDataBoundary,
  AiDataBoundaryError,
} from "../index.js";

describe("Voice Spoken Scripts & Template Selection (4 verdicts x 3 languages)", () => {
  const languages: VoiceLanguageCode[] = ["en-IN", "hi-IN", "kn-IN"];
  const verdicts: VoiceVerdictType[] = [
    "VERIFIED",
    "RECENTLY_REGISTERED",
    "UNVERIFIED",
    "WARNING",
  ];

  it("defines messages for all 3 supported languages", () => {
    for (const lang of languages) {
      expect(SUPPORTED_VOICE_LANGUAGES[lang]).toBeDefined();
      expect(SUPPORTED_VOICE_LANGUAGES[lang].code).toBe(lang);
      expect(SUPPORTED_VOICE_LANGUAGES[lang].nativeLabel).toBeTruthy();
    }
  });

  it("defines on-screen display labels for all 4 verdicts in all 3 languages", () => {
    for (const lang of languages) {
      for (const verdict of verdicts) {
        const label = VERDICT_DISPLAY_LABELS[lang][verdict];
        expect(label).toBeDefined();
        expect(label.title).toBeTruthy();
        expect(label.subtitle).toBeTruthy();
      }
    }
  });

  it("selects correct templates for all 4 verdicts x 3 languages", () => {
    for (const lang of languages) {
      for (const verdict of verdicts) {
        const script = formatVoiceScript(verdict, lang);
        expect(script).toBeTruthy();
        expect(typeof script).toBe("string");
        expect(script.length).toBeGreaterThan(10);
      }
    }
  });

  describe("English (en-IN) Templates", () => {
    it("formats VERIFIED with merchant name", () => {
      const script = formatVoiceScript("VERIFIED", "en-IN", "Sharma Kirana");
      expect(script).toBe(
        "You are about to pay Sharma Kirana. This merchant is verified. You can pay safely."
      );
    });

    it("formats RECENTLY_REGISTERED with merchant name", () => {
      const script = formatVoiceScript("RECENTLY_REGISTERED", "en-IN", "Sharma Kirana");
      expect(script).toBe(
        "You are about to pay Sharma Kirana. This merchant is recently registered and trust is still building. Please confirm with the shopkeeper before paying."
      );
    });

    it("formats UNVERIFIED without merchant name even if provided", () => {
      const script = formatVoiceScript("UNVERIFIED", "en-IN", "Attacker Store");
      expect(script).toBe(
        "This QR code is not verified. We cannot confirm who it belongs to. Please confirm with the shopkeeper before paying."
      );
      expect(script).not.toContain("Attacker Store");
    });

    it("formats WARNING without merchant name even if provided", () => {
      const script = formatVoiceScript("WARNING", "en-IN", "Malicious Shop");
      expect(script).toBe("Warning! Something is wrong with this QR code. Do not pay.");
      expect(script).not.toContain("Malicious Shop");
    });
  });

  describe("Hindi (hi-IN) Templates", () => {
    it("formats VERIFIED with merchant name in Hindi", () => {
      const script = formatVoiceScript("VERIFIED", "hi-IN", "शर्मा किराना");
      expect(script).toBe(
        "आप शर्मा किराना को भुगतान करने जा रहे हैं। यह व्यापारी सत्यापित है। आप सुरक्षित रूप से भुगतान कर सकते हैं।"
      );
    });

    it("formats RECENTLY_REGISTERED with merchant name in Hindi", () => {
      const script = formatVoiceScript("RECENTLY_REGISTERED", "hi-IN", "शर्मा किराना");
      expect(script).toBe(
        "आप शर्मा किराना को भुगतान करने जा रहे हैं। यह व्यापारी हाल ही में पंजीकृत हुआ है और भरोसा अभी बन रहा है। भुगतान से पहले दुकानदार से पुष्टि करें।"
      );
    });

    it("formats UNVERIFIED in Hindi without merchant name", () => {
      const script = formatVoiceScript("UNVERIFIED", "hi-IN", "फर्जी दुकान");
      expect(script).toBe(
        "यह क्यूआर कोड सत्यापित नहीं है। हम पुष्टि नहीं कर सकते कि यह किसका है। भुगतान से पहले दुकानदार से पूछ लें।"
      );
      expect(script).not.toContain("फर्जी दुकान");
    });

    it("formats WARNING in Hindi without merchant name", () => {
      const script = formatVoiceScript("WARNING", "hi-IN", "फर्जी दुकान");
      expect(script).toBe("चेतावनी! इस क्यूआर कोड में गड़बड़ी पाई गई है। भुगतान न करें।");
      expect(script).not.toContain("फर्जी दुकान");
    });
  });

  describe("Kannada (kn-IN) Templates", () => {
    it("formats VERIFIED with merchant name in Kannada", () => {
      const script = formatVoiceScript("VERIFIED", "kn-IN", "ಶರ್ಮಾ ಕಿರಾಣಿ");
      expect(script).toBe(
        "ನೀವು ಶರ್ಮಾ ಕಿರಾಣಿ ಅವರಿಗೆ ಪಾವತಿ ಮಾಡಲಿದ್ದೀರಿ. ಈ ವ್ಯಾಪಾರಿ ಪರಿಶೀಲಿತರಾಗಿದ್ದಾರೆ. ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ಪಾವತಿಸಬಹುದು."
      );
    });

    it("formats RECENTLY_REGISTERED with merchant name in Kannada", () => {
      const script = formatVoiceScript("RECENTLY_REGISTERED", "kn-IN", "ಶರ್ಮಾ ಕಿರಾಣಿ");
      expect(script).toBe(
        "ನೀವು ಶರ್ಮಾ ಕಿರಾಣಿ ಅವರಿಗೆ ಪಾವತಿ ಮಾಡಲಿದ್ದೀರಿ. ಈ ವ್ಯಾಪಾರಿ ಇತ್ತೀಚೆಗೆ ನೋಂದಾಯಿಸಿದ್ದಾರೆ, ವಿಶ್ವಾಸ ಇನ್ನೂ ಬೆಳೆಯುತ್ತಿದೆ. ಪಾವತಿಸುವ ಮೊದಲು ಅಂಗಡಿಯವರೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ."
      );
    });

    it("formats UNVERIFIED in Kannada without merchant name", () => {
      const script = formatVoiceScript("UNVERIFIED", "kn-IN", "ಅಜ್ಞಾತ ಅಂಗಡಿ");
      expect(script).toBe(
        "ಈ ಕ್ಯೂಆರ್ ಕೋಡ್ ಪರಿಶೀಲಿತವಾಗಿಲ್ಲ. ಇದು ಯಾರದು ಎಂದು ನಾವು ಖಚಿತಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಪಾವತಿಸುವ ಮೊದಲು ಅಂಗಡಿಯವರನ್ನು ಕೇಳಿ."
      );
      expect(script).not.toContain("ಅಜ್ಞಾತ ಅಂಗಡಿ");
    });

    it("formats WARNING in Kannada without merchant name", () => {
      const script = formatVoiceScript("WARNING", "kn-IN", "ಅಜ್ಞಾತ ಅಂಗಡಿ");
      expect(script).toBe(
        "ಎಚ್ಚರಿಕೆ! ಈ ಕ್ಯೂಆರ್ ಕೋಡ್ನಲ್ಲಿ ಸಮಸ್ಯೆ ಕಂಡುಬಂದಿದೆ. ಪಾವತಿ ಮಾಡಬೇಡಿ."
      );
      expect(script).not.toContain("ಅಜ್ಞಾತ ಅಂಗಡಿ");
    });
  });
});

describe("Sarvam Voice Privacy Boundary Guard (assertSarvamVoiceDataBoundary)", () => {
  it("allows valid Sarvam request payloads (text, target_language_code, speaker, model, merchantDisplayName)", () => {
    const cleanPayload = {
      text: "You are about to pay Sharma Kirana. This merchant is verified. You can pay safely.",
      target_language_code: "en-IN",
      speaker: "shubh",
      model: "bulbul:v3",
      merchantDisplayName: "Sharma Kirana",
    };

    expect(() => assertSarvamVoiceDataBoundary(cleanPayload)).not.toThrow();
  });

  it("strictly throws when GST/Udyam number is in the payload", () => {
    const dirtyPayload = {
      text: "You are about to pay Sharma Kirana.",
      target_language_code: "en-IN",
      gstUdyamNumber: "29ABCDE1234F1Z5",
    };

    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      AiDataBoundaryError
    );
    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      /Forbidden field 'gstUdyamNumber'/
    );
  });

  it("strictly throws when an unredacted GSTIN is embedded inside the text string", () => {
    const dirtyText = {
      text: "You are about to pay merchant 29ABCDE1234F1Z5 safely.",
      target_language_code: "en-IN",
    };

    expect(() => assertSarvamVoiceDataBoundary(dirtyText)).toThrow(AiDataBoundaryError);
    expect(() => assertSarvamVoiceDataBoundary(dirtyText)).toThrow(
      /unredacted GST\/Udyam/
    );
  });

  it("strictly throws when raw bank VPA is present", () => {
    const dirtyPayload = {
      text: "Voice message text",
      target_language_code: "en-IN",
      bank_vpa: "merchant@okhdfcbank",
    };

    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      AiDataBoundaryError
    );
    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      /Forbidden field 'bank_vpa'/
    );
  });

  it("strictly throws when GPS coordinates are present", () => {
    const dirtyPayload = {
      text: "Voice message text",
      target_language_code: "en-IN",
      latitude: 12.9716,
      longitude: 77.5946,
    };

    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      AiDataBoundaryError
    );
    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      /Forbidden field 'latitude'/
    );
  });

  it("strictly throws when KYC address or phone is present", () => {
    const dirtyPayload = {
      text: "Voice message text",
      target_language_code: "en-IN",
      kyc_address: "123 Main St, Bangalore",
      contact_phone: "+919876543210",
    };

    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      AiDataBoundaryError
    );
  });

  it("strictly throws when photo bytes or embeddings are present", () => {
    const dirtyPayload = {
      text: "Voice message text",
      target_language_code: "en-IN",
      photoBase64: "data:image/jpeg;base64,...",
      referenceEmbedding: [0.12, 0.45],
    };

    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      AiDataBoundaryError
    );
  });

  it("strictly throws when internal audit outputs or scores are present", () => {
    const dirtyPayload = {
      text: "Voice message text",
      target_language_code: "en-IN",
      agentOutputs: { trust: { score: 95 } },
    };

    expect(() => assertSarvamVoiceDataBoundary(dirtyPayload)).toThrow(
      AiDataBoundaryError
    );
  });
});
