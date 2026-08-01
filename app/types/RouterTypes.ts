export type RootStackParamList = {
  FolderSetup: undefined;
  Library: undefined;
  Player: undefined;
  Chapters: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
