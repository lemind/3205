import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface JobsPageState {
  activeJobId: string | null;
}

const initialState: JobsPageState = {
  activeJobId: null,
};

const jobsPageSlice = createSlice({
  name: 'jobsPage',
  initialState,
  reducers: {
    setActiveJob(state, action: PayloadAction<string | null>) {
      state.activeJobId = action.payload;
    },
  },
});

export const { setActiveJob } = jobsPageSlice.actions;
export const jobsPageReducer = jobsPageSlice.reducer;
export const selectActiveJobId = (state: { jobsPage: JobsPageState }): string | null =>
  state.jobsPage.activeJobId;
