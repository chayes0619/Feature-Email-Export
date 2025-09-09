import {
  React,
  DataSourceTypes,
  Immutable,
  type UseDataSource,
} from "jimu-core";
import { type AllWidgetSettingProps } from "jimu-for-builder";
import { type IMConfig } from "../config";
import { TextInput, Label, Button, Select, Option } from "jimu-ui";
import {
  DataSourceSelector,
  FieldSelector,
} from "jimu-ui/advanced/data-source-selector";

const Setting: React.FC<AllWidgetSettingProps<IMConfig>> = (props) => {
  const [selectedFields, setSelectedFields] = React.useState<string[]>([]);
  const [showPreview, setShowPreview] = React.useState<boolean>(false);

  const updateFieldsFromDataSource = React.useCallback(async () => {
    const { useDataSources } = props;
    try {
      if (useDataSources && useDataSources.length > 0) {
        const dataSource = useDataSources[0];

        // Try multiple ways to get field information
        let fieldNames: string[] = [];

        // Method 1: Check if fields are directly available
        if (dataSource.fields) {
          if (Array.isArray(dataSource.fields)) {
            fieldNames = dataSource.fields;
          } else {
            fieldNames = Object.keys(dataSource.fields);
          }
        }

        // Method 2: Use DataSourceManager to get the actual data source
        if (fieldNames.length === 0) {
          try {
            const { DataSourceManager } = await import("jimu-core");
            const ds = DataSourceManager.getInstance().getDataSource(
              dataSource.dataSourceId
            );
            if (ds && ds.getSchema) {
              const schema = ds.getSchema();
              if (schema && schema.fields) {
                fieldNames = Object.keys(schema.fields);
              }
            }
          } catch (e) {
            console.log("DataSourceManager method failed:", e);
          }
        }

        // Method 3: Check for layerDefinition (with type assertion)
        if (
          fieldNames.length === 0 &&
          (dataSource as any).layerDefinition?.fields
        ) {
          fieldNames = (dataSource as any).layerDefinition.fields.map(
            (field: any) => field.name
          );
        }

        // If still no fields found, provide some common ones as fallback
        if (fieldNames.length === 0) {
          fieldNames = [
            "OBJECTID",
            "FID",
            "NAME",
            "ADDRESS",
            "EMAIL",
            "PHONE",
            "DESCRIPTION",
            "TYPE",
            "STATUS",
          ];
          console.log("Using fallback fields:", fieldNames);
        }

        console.log(
          "Found fields:",
          fieldNames,
          "from data source:",
          dataSource
        );
        setSelectedFields(fieldNames);
      } else {
        setSelectedFields([]);
      }
    } catch (error) {
      console.error("Error updating fields from data source:", error);
      setSelectedFields([]);
    }
  }, [props.useDataSources]);

  React.useEffect(() => {
    updateFieldsFromDataSource();
  }, [updateFieldsFromDataSource]);

  React.useEffect(() => {
    updateFieldsFromDataSource();
  }, [props.useDataSources, updateFieldsFromDataSource]);

  const onDataSourceChange = React.useCallback(
    (useDataSources: UseDataSource[]) => {
      try {
        console.log("Data source changed:", useDataSources);
        props.onSettingChange({
          id: props.id,
          useDataSources: useDataSources,
        });

        // Update fields with multiple attempts
        setTimeout(() => {
          updateFieldsFromDataSource();
        }, 100);

        setTimeout(() => {
          updateFieldsFromDataSource();
        }, 500);

        setTimeout(() => {
          updateFieldsFromDataSource();
        }, 1000);
      } catch (error) {
        console.error("Error changing data source:", error);
      }
    },
    [props.onSettingChange, props.id, updateFieldsFromDataSource]
  );

  const onEmailSubjectChange = React.useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      props.onSettingChange({
        id: props.id,
        config: props.config.set("emailSubject", evt.currentTarget.value),
      });
    },
    [props.onSettingChange, props.id, props.config]
  );

  const onEmailHtmlTemplateChange = React.useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      props.onSettingChange({
        id: props.id,
        config: props.config.set("emailHtmlTemplate", evt.currentTarget.value),
      });
    },
    [props.onSettingChange, props.id, props.config]
  );

  const onRecipientFieldChange = React.useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      props.onSettingChange({
        id: props.id,
        config: props.config.set("recipientField", evt.currentTarget.value),
      });
    },
    [props.onSettingChange, props.id, props.config]
  );

  const insertPlaceholder = React.useCallback(
    (placeholder: string) => {
      const currentTemplate = props.config.emailHtmlTemplate || "";
      const newTemplate = currentTemplate + placeholder;

      props.onSettingChange({
        id: props.id,
        config: props.config.set("emailHtmlTemplate", newTemplate),
      });
    },
    [props.onSettingChange, props.id, props.config]
  );

  const togglePreview = React.useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  const generatePreviewHTML = React.useMemo(() => {
    const { config } = props;
    const template =
      config.emailHtmlTemplate ||
      "<h1>Feature Information</h1>\n<p>Object ID: {OBJECTID}</p>\n<p>Selected feature data will populate here</p>";

    // Create sample data for preview
    const sampleData: { [key: string]: any } = {};
    selectedFields.forEach((field) => {
      if (field.toLowerCase().includes("email")) {
        sampleData[field] = "user@example.com";
      } else if (field.toLowerCase().includes("name")) {
        sampleData[field] = "Sample Feature Name";
      } else if (field.toLowerCase().includes("address")) {
        sampleData[field] = "123 Main Street, Sample City";
      } else if (field.toLowerCase().includes("phone")) {
        sampleData[field] = "(555) 123-4567";
      } else if (
        field.toLowerCase().includes("id") ||
        field.toLowerCase().includes("objectid")
      ) {
        sampleData[field] = "12345";
      } else if (field.toLowerCase().includes("description")) {
        sampleData[field] = "This is a sample description for the feature.";
      } else {
        sampleData[field] = `Sample ${field} Value`;
      }
    });

    // If no fields are available, use some default sample data
    if (selectedFields.length === 0) {
      sampleData["OBJECTID"] = "12345";
      sampleData["NAME"] = "Sample Feature";
      sampleData["EMAIL"] = "user@example.com";
      sampleData["ADDRESS"] = "123 Main Street";
    }

    // Replace placeholders with sample data
    let previewHTML = template;
    Object.keys(sampleData).forEach((field) => {
      const placeholder = `{${field}}`;
      previewHTML = previewHTML.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        sampleData[field]
      );
    });

    // Replace any remaining placeholders with styled placeholder text
    previewHTML = previewHTML.replace(
      /{([^}]+)}/g,
      '<span style="background: #fff3cd; color: #856404; padding: 2px 4px; border-radius: 3px;">[{$1}]</span>'
    );

    // Wrap in a div with email-like styling to ensure proper rendering
    // Use !important to override any dark mode styles
    return `<div style="color: #333333 !important; font-family: Arial, sans-serif; line-height: 1.5; font-size: 14px; background-color: #ffffff !important;">
      <style>
        * { color: #333333 !important; }
        h1, h2, h3, h4, h5, h6 { color: #222222 !important; margin-top: 0; }
        p { color: #333333 !important; margin-bottom: 16px; }
        a { color: #007bff !important; text-decoration: underline; }
        strong, b { color: #222222 !important; font-weight: bold; }
        em, i { color: #333333 !important; font-style: italic; }
      </style>
      ${previewHTML}
    </div>`;
  }, [props.config, selectedFields]);

  const { config } = props;

  return (
    <div className="widget-setting-email-export p-4">
      <div className="mb-4">
        <Label>Select Data Source:</Label>
        <DataSourceSelector
          types={Immutable([DataSourceTypes.FeatureLayer])}
          useDataSources={props.useDataSources}
          onChange={onDataSourceChange}
          widgetId={props.id}
          mustUseDataSource
        />
        {!props.useDataSources || props.useDataSources.length === 0 ? (
          <small className="text-muted">
            Select a feature layer to use for email data
          </small>
        ) : (
          <small className="text-success">
            ✓ Data source selected - {selectedFields.length} fields available
          </small>
        )}
      </div>

      {props.useDataSources && props.useDataSources.length > 0 && (
        <div className="mb-4" style={{ display: "none" }}>
          <FieldSelector
            useDataSources={props.useDataSources}
            onChange={(allFieldsSchemas) => {
              if (allFieldsSchemas && allFieldsSchemas.length > 0) {
                const fieldNames = allFieldsSchemas.map(
                  (field: any) => field.jimuName || field.name
                );
                console.log("Fields from FieldSelector:", fieldNames);
                setSelectedFields(fieldNames);
              }
            }}
            isMultiple
            isDataSourceDropDownHidden
          />
        </div>
      )}

      <div className="mb-3">
        <Label>Email Recipient Field:</Label>
        <Select
          value={config.recipientField || ""}
          onChange={onRecipientFieldChange}
          placeholder="Select field containing email addresses"
        >
          <Option value="">-- No recipient field --</Option>
          {selectedFields &&
            selectedFields.map((field: string, index: number) => (
              <Option key={`recipient-${field}-${index}`} value={field}>
                {field}
              </Option>
            ))}
        </Select>
        <small className="text-muted">
          Choose a field that contains email addresses to auto-populate
          recipients
        </small>
      </div>

      <div className="mb-3">
        <Label>Email Subject:</Label>
        <TextInput
          value={config.emailSubject || ""}
          onChange={onEmailSubjectChange}
          placeholder="Enter email subject"
        />
      </div>

      <div className="mb-3">
        <Label>Email HTML Template:</Label>
        <div className="mb-2">
          <small className="text-muted">
            Use placeholders like {"{fieldName}"} to insert feature attribute
            values
          </small>
        </div>

        {selectedFields && selectedFields.length > 0 && (
          <div className="mb-2">
            <strong>Available Fields - Click to Insert:</strong>
            <div className="d-flex gap-2 flex-wrap mt-1">
              {selectedFields
                .slice(0, 8)
                .map((field: string, index: number) => (
                  <Button
                    key={`${field}-${index}`}
                    size="sm"
                    onClick={() => insertPlaceholder(`{${field}}`)}
                    title={`Insert ${field} placeholder`}
                    type="tertiary"
                  >
                    {`{${field}}`}
                  </Button>
                ))}
              {selectedFields.length > 8 && (
                <small className="text-muted align-self-center">
                  ... and {selectedFields.length - 8} more fields
                </small>
              )}
            </div>
          </div>
        )}

        <textarea
          className="form-control"
          value={
            config.emailHtmlTemplate ||
            "<h1>Feature Information</h1>\n<p>Object ID: {OBJECTID}</p>\n<p>Selected feature data will populate here</p>"
          }
          onChange={onEmailHtmlTemplateChange}
          placeholder="Enter HTML template with placeholders like {fieldName}"
          rows={8}
          style={{ minHeight: "200px", width: "100%" }}
        />

        <div className="mt-2">
          <Button type="tertiary" size="sm" onClick={togglePreview}>
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
        </div>

        {showPreview && (
          <div className="mt-3">
            <Label>Email Preview:</Label>
            <div
              style={{
                backgroundColor: "#ffffff !important",
                color: "#333333 !important",
                borderRadius: "4px",
                minHeight: "100px",
                maxHeight: "400px",
                overflow: "auto",
                border: "2px solid #dee2e6",
                fontFamily: "Arial, sans-serif",
                padding: "16px",
                boxShadow: "inset 0 0 0 1000px #ffffff", // Force white background even in dark mode
              }}
              dangerouslySetInnerHTML={{
                __html: generatePreviewHTML,
              }}
            />
            <small className="text-muted mt-1 d-block">
              Preview uses sample data. Highlighted items like{" "}
              <span
                style={{
                  background: "#fff3cd",
                  color: "#856404",
                  padding: "2px 4px",
                  borderRadius: "3px",
                }}
              >
                [{"{field}"}]
              </span>{" "}
              are placeholders that couldn't be replaced.
            </small>
          </div>
        )}
      </div>

      <div className="alert alert-info">
        <strong>Instructions:</strong>
        <ul className="mb-0 mt-2">
          <li>First select a feature layer data source above</li>
          <li>
            Choose a field containing email addresses for recipients (optional)
          </li>
          <li>
            Use curly braces around field names: <code>{"{fieldName}"}</code>
          </li>
          <li>
            Field names are case-sensitive and match your selected data source
          </li>
          <li>
            Click field buttons above to insert placeholders automatically
          </li>
          <li>
            <strong>
              Use "Show Preview" to see how your email template will look with
              sample data
            </strong>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Setting;
