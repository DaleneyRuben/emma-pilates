import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { GlyphName } from "./glyph";
import { StateScreen } from "./state-screen";
import { spacing } from "./tokens";

type IconName = GlyphName;

export type EmptyStateProps =
  | {
      icon: IconName;
      message: string;
      title: string;
      /** `framed` stands in a list on Lino; `panel` is the bare tablet panel. */
      variant?: "framed" | "panel";
    }
  | {
      /** The action under the note, such as S21's «Reservar una clase». */
      action?: ReactNode;
      icon?: IconName;
      message?: string;
      title: string;
      /** `plain` is centred both ways on the screen. */
      variant: "plain";
    };

const layouts = { framed: "card", panel: "inList", plain: "centred" } as const;

/** An empty state drawn as v2's state block (follow-up 225 §6, `StateScreen`). */
export function EmptyState(props: EmptyStateProps) {
  const { icon, message, title, variant = "framed" } = props;
  const action = props.variant === "plain" ? props.action : undefined;
  return (
    <StateScreen
      icon={icon}
      layout={layouts[variant]}
      note={message}
      testIDPrefix="empty-state"
      title={title}
    >
      {action === undefined ? null : (
        <View style={styles.action} testID="empty-state-action">
          {action}
        </View>
      )}
    </StateScreen>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing.sm, minWidth: 220 },
});
