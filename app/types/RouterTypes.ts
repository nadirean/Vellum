// Parameter list for the app's native stack navigator. Every route takes no params today.
export type RootStackParamList = {
  FolderSetup: undefined;
  Library: undefined;
  Player: undefined;
  Chapters: undefined;
};

// Makes typed navigation helpers (useNavigation) resolve RootStackParamList globally.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
