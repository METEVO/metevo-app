export const metevoDesignTokens = {
  "currency": "USDm",
  "referenceFrame": {
    "width": 236.8,
    "height": 512,
    "units": "SVG user units, not device dp"
  },
  "dark": {
    "background": "#000000",
    "surface": "#0A1214",
    "border": "#1B2A2D",
    "text": "#F2FBF9",
    "muted": "#9DB5B2",
    "onAccent": "#0A1214",
    "states": {
      "idle": {
        "fill": "#26D9A5",
        "ink": "#26D9A5",
        "soft": "#0D2A25"
      },
      "listening": {
        "fill": "#FF5C7A",
        "ink": "#FF5C7A",
        "soft": "#271B20"
      },
      "processing": {
        "fill": "#7C9CFF",
        "ink": "#7C9CFF",
        "soft": "#182330"
      },
      "success": {
        "fill": "#B6F26B",
        "ink": "#B6F26B",
        "soft": "#1F2D1E"
      },
      "attention": {
        "fill": "#FF8A4C",
        "ink": "#FF8A4C",
        "soft": "#27201B"
      }
    },
    "controlBorder": "#9DB5B2"
  },
  "light": {
    "background": "#FFFFFF",
    "surface": "#F0F6F3",
    "border": "#D8E5E0",
    "text": "#132D29",
    "muted": "#526B65",
    "onAccent": "#132D29",
    "states": {
      "idle": {
        "fill": "#20C997",
        "ink": "#006C50",
        "soft": "#E4F8F0"
      },
      "listening": {
        "fill": "#F27794",
        "ink": "#A62449",
        "soft": "#FDECF1"
      },
      "processing": {
        "fill": "#91A6F4",
        "ink": "#3E52B5",
        "soft": "#EDF0FD"
      },
      "success": {
        "fill": "#ACDA79",
        "ink": "#3E6D1B",
        "soft": "#EFF7E7"
      },
      "attention": {
        "fill": "#F5A16D",
        "ink": "#A44816",
        "soft": "#FFF1E8"
      }
    },
    "controlBorder": "#526B65"
  },
  "typography": {
    "family": "Arial",
    "hindiFallback": [
      "Arial Unicode MS",
      "Noto Sans Devanagari"
    ],
    "title": {
      "size": 14.16,
      "weight": 700
    },
    "body": {
      "size": 9.44,
      "weight": 400
    },
    "label": {
      "size": 8.26,
      "weight": 400
    },
    "languageOption": {
      "size": 9.79,
      "weight": 700
    },
    "demo": {
      "size": 7.08,
      "weight": 400
    }
  },
  "layout": {
    "headerY": 40.5,
    "balance": {
      "x": 15.4,
      "y": 97.2,
      "width": 206,
      "height": 43
    },
    "taskCanvas": {
      "x": 15.4,
      "y": 150.2,
      "width": 206,
      "height": 181
    },
    "mainVoice": {
      "cx": 118.4,
      "cy": 388.2,
      "radius": 31.5
    },
    "onboardingVoice": {
      "cx": 120.07,
      "cy": 405.7,
      "radius": 31.5
    },
    "bottomControls": {
      "y": 450.2,
      "height": 28.32
    },
    "contentInset": 25.4,
    "actionHeight": 28.32,
    "pairedActionGap": 9,
    "cardRadius": 5,
    "stateOutline": 0.8,
    "buttonOutline": 0.65,
    "voiceLabelClearance": 7,
    "voiceLabelClearanceNote": "Reference units between outer accessibility cue and label cap-height; scale with the voice control. Preserve microphone centre."
  },
  "runtimeGuidance": {
    "scaleFormula": "logicalWindowWidth / 236.8",
    "safeArea": "Use real insets; status/time/gesture elements in SVG are mock device chrome.",
    "typeScaling": "Allow OS font scaling; reflow and scroll content rather than shrinking text.",
    "touchTarget": "Implementation target: at least 48x48 logical pixels, using hit area where visual size is smaller.",
    "voiceAnchor": "Keep fixed in app shell. Keyboard and enlarged text require a measured responsive adaptation, not literal canvas scaling."
  },
  "accessibility": {
    "default": true,
    "optionalMode": false,
    "colourAlone": false,
    "source": "METEVO svg_interface_all_screens copy.svg",
    "stateCues": {
      "idle": "filled microphone circle",
      "listening": "stop square + solid outer ring",
      "processing": "processing symbol + dashed outer ring",
      "success": "checkmark + rounded-square outer outline",
      "attention": "attention symbol + four corner brackets"
    },
    "geometryAtFillRadius53": {
      "outlineWidth": 3.5,
      "ringRadius": 63,
      "dash": [
        9,
        8
      ],
      "successSize": 124,
      "successRadius": 18
    },
    "assetViewBox": "-8 -8 80 80",
    "assetPlacement": "Preserve the original 63-unit fill diameter and centre; the expanded viewport accommodates outlines. Do not fit the 80-unit asset into the old 64-unit box."
  },
  "nativeLayout": {
    "bodyMinSp": 16,
    "secondaryMinSp": 14,
    "touchTargetMinDp": 48,
    "fontScale": "Respect system scaling; reflow and scroll the task panel",
    "currencySpoken": "U S D M",
    "screenArtwork": "236.8 x 512 reference units; not a fixed native bitmap",
    "navigation": "One HomeScreen with panel state; no new router dependency"
  }
} as const;
