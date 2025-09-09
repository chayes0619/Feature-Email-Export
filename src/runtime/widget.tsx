import { React, type AllWidgetProps, DataSourceComponent } from "jimu-core";
import { type IMConfig } from "../config";
import { type FeatureLayerDataSource } from "jimu-arcgis";

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const [selectedFeatureData, setSelectedFeatureData] = React.useState<{
    [key: string]: any;
  }>({});
  const [dataSource, setDataSource] =
    React.useState<FeatureLayerDataSource | null>(null);
  const [selectedFeatureCount, setSelectedFeatureCount] =
    React.useState<number>(0);

  const replacePlaceholders = (
    template: string,
    featureData: { [key: string]: any }
  ): string => {
    if (!featureData || !template) return template;

    let processedTemplate = template;

    // Replace placeholders with feature attribute values
    Object.keys(featureData).forEach((fieldName) => {
      const placeholder = `{${fieldName}}`;
      const value = featureData[fieldName];
      processedTemplate = processedTemplate.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value !== null && value !== undefined ? String(value) : ""
      );
    });

    return processedTemplate;
  };

  const exportEmail = () => {
    const { config } = props;
    const emailSubject = config.emailSubject || "Feature Information";
    const htmlTemplate =
      config.emailHtmlTemplate ||
      "<h1>Feature Information</h1><p>No template configured</p>";

    let emailBody = htmlTemplate;
    let emailTo = "";

    // If we have feature data, use it to replace placeholders
    if (Object.keys(selectedFeatureData).length > 0) {
      emailBody = replacePlaceholders(htmlTemplate, selectedFeatureData);

      // Get recipient email from configured field
      if (config.recipientField && selectedFeatureData[config.recipientField]) {
        emailTo = selectedFeatureData[config.recipientField];
      }
    } else {
      // Show placeholder text if no feature data is available
      emailBody = htmlTemplate.replace(
        /{([^}]+)}/g,
        "[No feature data - $1 will be replaced when data is provided]"
      );
    }

    // Create email content
    let emlCont = "To: " + emailTo + "\n";
    emlCont += "Subject: " + emailSubject + "\n";
    emlCont += "X-Unsent: 1" + "\n";
    emlCont += "Content-Type: text/html" + "\n";
    emlCont += "" + "\n";
    emlCont +=
      "<!DOCTYPE html><html><head></head><body>" + emailBody + "</body></html>";

    // Create and download email file
    const data = new Blob([emlCont], { type: "text/plain" });
    const textFile = window.URL.createObjectURL(data);

    const a = document.createElement("a");
    a.href = textFile;
    a.download = emailSubject + ".eml";
    a.style.visibility = "hidden";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(textFile);
  };

  // Effect to handle data source changes and set up selection listener
  React.useEffect(() => {
    if (dataSource) {
      // Function to update selected features
      const updateSelectedFeatures = () => {
        try {
          const selected = dataSource.getSelectedRecords();
          const count = selected ? selected.length : 0;
          setSelectedFeatureCount(count);

          if (selected && selected.length === 1) {
            // Exactly one feature selected - this is what we want
            const firstRecord = selected[0];
            const attributes = firstRecord.getData() || {};
            console.log("Single feature selected, attributes:", attributes);
            setSelectedFeatureData(attributes);
          } else if (selected && selected.length > 1) {
            // Multiple features selected
            console.log(
              `Multiple features selected (${selected.length}), export disabled`
            );
            setSelectedFeatureData({});
          } else {
            // No features selected
            console.log("No features selected");
            setSelectedFeatureData({});
          }
        } catch (error) {
          console.error("Error getting selected records:", error);
          setSelectedFeatureData({});
          setSelectedFeatureCount(0);
        }
      };

      // Initial update
      updateSelectedFeatures();

      // Set up interval to check for selection changes
      const intervalId = setInterval(() => {
        updateSelectedFeatures();
      }, 1000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [dataSource]);

  // Function to handle data source creation
  const onDataSourceCreated = (ds: FeatureLayerDataSource) => {
    try {
      console.log("Data source created:", ds);
      setDataSource(ds);

      // Get initial selected records
      if (ds && ds.getSelectedRecords) {
        const selected = ds.getSelectedRecords();
        console.log("Initial selected records:", selected);
        if (selected && selected.length > 0) {
          const firstRecord = selected[0];
          const attributes = firstRecord.getData() || {};
          console.log("Initial selected attributes:", attributes);
          setSelectedFeatureData(attributes);
        }
      }
    } catch (error) {
      console.error("Error in onDataSourceCreated:", error);
    }
  };

  const hasDataSource = props.useDataSources && props.useDataSources.length > 0;

  return (
    <div className="widget-email-export jimu-widget m-2">
      {hasDataSource && (
        <div>
          <DataSourceComponent
            useDataSource={props.useDataSources[0]}
            widgetId={props.id}
            onDataSourceCreated={onDataSourceCreated}
          ></DataSourceComponent>
        </div>
      )}
      <div className="mb-3">
        <p>
          <strong>Selection Status:</strong>
        </p>
        {selectedFeatureCount === 0 ? (
          <div>
            <small className="text-muted">No features selected</small>
            {dataSource && (
              <div className="mt-1">
                <small className="text-info">
                  Data source connected - select exactly one feature to enable
                  export
                </small>
              </div>
            )}
          </div>
        ) : selectedFeatureCount === 1 ? (
          <div>
            <small className="text-success">
              ✓ 1 feature selected - ready for export
            </small>
            {props.config.recipientField &&
              selectedFeatureData[props.config.recipientField] && (
                <div className="mt-1">
                  <small className="text-info">
                    📧 Recipient:{" "}
                    {selectedFeatureData[props.config.recipientField]}
                  </small>
                </div>
              )}
          </div>
        ) : (
          <div>
            <small className="text-warning">
              ⚠ {selectedFeatureCount} features selected - please select exactly
              one feature
            </small>
            <div className="mt-1">
              <small className="text-muted">
                Export is disabled when multiple features are selected
              </small>
            </div>
          </div>
        )}
      </div>
      <button
        className={`btn ${
          hasDataSource && selectedFeatureCount === 1
            ? "btn-primary"
            : hasDataSource
            ? "btn-secondary"
            : "btn-primary"
        }`}
        onClick={exportEmail}
        disabled={hasDataSource && selectedFeatureCount !== 1}
        title={
          !hasDataSource
            ? "Export email (will use manual data or placeholder text)"
            : selectedFeatureCount === 0
            ? "Select exactly one feature to enable export"
            : selectedFeatureCount === 1
            ? "Export email with selected feature data"
            : `Export disabled - ${selectedFeatureCount} features selected (need exactly 1)`
        }
      >
        Export Email
        {hasDataSource && selectedFeatureCount !== 1 && (
          <span className="ms-1">
            {selectedFeatureCount === 0
              ? "⚠"
              : selectedFeatureCount > 1
              ? `(${selectedFeatureCount})`
              : ""}
          </span>
        )}
      </button>

      {!hasDataSource && (
        <div className="alert alert-info mt-3">
          <small>
            <strong>Setup Required:</strong> Go to widget settings to select a
            feature layer data source for automatic feature selection.
          </small>
        </div>
      )}

      {hasDataSource && selectedFeatureCount !== 1 && (
        <div
          className={`alert ${
            selectedFeatureCount === 0 ? "alert-warning" : "alert-info"
          } mt-3`}
        >
          <small>
            <strong>
              {selectedFeatureCount === 0
                ? "No Selection:"
                : "Multiple Selection:"}
            </strong>
            {selectedFeatureCount === 0
              ? " Select exactly one feature on the map to populate the email with feature data."
              : ` You have ${selectedFeatureCount} features selected. Please select exactly one feature to enable email export.`}
          </small>
        </div>
      )}
    </div>
  );
};

export default Widget;
