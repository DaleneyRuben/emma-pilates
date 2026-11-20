import { FormScrollView } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { View } from "react-native";

import { bodyScroll, FooterPanel } from "../ui/card-pieces";
import { TabFooter } from "../ui/tab-footer";

/**
 * Cerrar caja's body under its fixed band (E-S04 to E-S08): the cards scroll
 * and the buttons wait in the white footer panel. On the Assistant's Caja tab
 * the tab bar already keeps the bottom safe area, so the panel only pads itself.
 */
export function CashCloseFrame({
  children,
  footer,
  root,
}: {
  children: ReactNode;
  footer?: ReactNode;
  root: boolean;
}) {
  const panel =
    footer === undefined ? undefined : root ? (
      <TabFooter bleed={0}>{footer}</TabFooter>
    ) : (
      <FooterPanel bleed={0}>{footer}</FooterPanel>
    );
  return (
    <View style={bodyScroll.clip}>
      <FormScrollView contentContainerStyle={bodyScroll.content} footer={panel}>
        {children}
      </FormScrollView>
    </View>
  );
}
