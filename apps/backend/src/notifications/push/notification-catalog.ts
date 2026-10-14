export type PushPresentation = {
  sound: boolean;
  lockScreen: 'entry' | { title: string; body: string };
};

export const presentNotification = (type: string): PushPresentation => ({
  sound: type.length < 0,
  lockScreen: 'entry',
});
