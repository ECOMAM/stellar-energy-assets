import { Suspense } from "react";
import ProjectRoute from "./ProjectRoute";
import { ProjectLoading } from "./ProjectStates";

/**
 * Project detail: /project/?id=N. With `output: "export"` this is ONE static
 * page (out/project/index.html) for every project, including the ones created
 * on-chain after the build; the id is read in the browser. useSearchParams()
 * needs this Suspense boundary: the exported HTML holds the fallback and the
 * client renders the project.
 */
export default function ProjectPage() {
  return (
    <Suspense fallback={<ProjectLoading />}>
      <ProjectRoute />
    </Suspense>
  );
}
