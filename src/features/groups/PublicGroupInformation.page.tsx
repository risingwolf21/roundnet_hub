import React from "react";
import Layout from "src/components/layout/Layout";
import PublicGroupInformation from "./PublicGroupInformation";

const PublicGroupInformationPage = () => {

  return <Layout appBarConfig={{ navigateBackPath: "/groups/list" }}>
    <PublicGroupInformation />
  </Layout>
}

export default PublicGroupInformationPage