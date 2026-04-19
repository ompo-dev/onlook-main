// src/Editor/PropertiesPanel/sections/MotionCard.tsx
import { Fragment as Fragment22, jsx as jsx56, jsxs as jsxs41 } from "react/jsx-runtime";
function MotionCard({
  headerLabel,
  headerContent,
  headerActions,
  selected,
  children,
  secondaryContent,
  hasNonDefaultSecondary: hasNonDefaultSecondary2
}) {
  const [userToggled, setUserToggled] = useState22(false);
  const [userExpanded, setUserExpanded] = useState22(false);
  const isExpanded = userToggled ? userExpanded : hasNonDefaultSecondary2 ?? false;
  const handleToggle = () => {
    if (!userToggled) {
      setUserToggled(true);
      setUserExpanded(!isExpanded);
    } else {
      setUserExpanded(!userExpanded);
    }
  };
  return /* @__PURE__ */ jsxs41("div", { className: `${MotionCard_default.card} ${selected ? MotionCard_default.selected : ""}`, children: [
    /* @__PURE__ */ jsxs41("div", { className: MotionCard_default.header, children: [
      headerLabel && /* @__PURE__ */ jsx56("span", { className: MotionCard_default.headerLabel, children: headerLabel }),
      /* @__PURE__ */ jsx56("div", { className: MotionCard_default.headerContent, children: headerContent }),
      headerActions && /* @__PURE__ */ jsx56("div", { className: MotionCard_default.headerActions, children: headerActions })
    ] }),
    /* @__PURE__ */ jsx56("div", { className: MotionCard_default.body, children }),
    secondaryContent && /* @__PURE__ */ jsxs41(Fragment22, { children: [
      /* @__PURE__ */ jsxs41(
        "button",
        {
          className: MotionCard_default.moreToggle,
          onClick: handleToggle,
          children: [
            /* @__PURE__ */ jsx56(
              "span",
              {
                className: `${MotionCard_default.moreChevron} ${isExpanded ? MotionCard_default.expanded : ""}`,
                children: /* @__PURE__ */ jsx56(ChevronIcon, {})
              }
            ),
            isExpanded ? "Less" : "More"
          ]
        }
      ),
      isExpanded && /* @__PURE__ */ jsx56("div", { className: MotionCard_default.secondary, children: secondaryContent })
    ] })
  ] });
}

