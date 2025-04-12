import { LinearProgress } from "@mui/material";

const ProgressElement = (pageName: string, progress: Record<string, number>) => (
    <div style={{ width: "100%" }}>
      <LinearProgress variant="determinate" value={progress[pageName] ?? 0} />
    </div>
  );

export default ProgressElement;