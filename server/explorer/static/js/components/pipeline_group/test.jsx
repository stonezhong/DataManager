import React from 'react'

import Button from 'react-bootstrap/Button'

import {PipelineGroupEditor} from './pipeline_group_editor.jsx'

export class TestPipelineGroupEditor extends React.Component {
    testPipelineGroupEditorRef = React.createRef();

    onSave = (mode, pipeline_group) => {
        console.log(`pipeline group is saved as ${mode}`);
        console.log(pipeline_group);
    };

    render() {
        return (
            <div>
                <h2>Test SQLSetepEditor</h2>
                <PipelineGroupEditor
                    ref={this.testPipelineGroupEditorRef}
                    onSave={this.onSave}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testPipelineGroupEditorRef.current.openDialog(
                            "edit",
                            {
                                id: 'eeea8045-11b3-460c-b21e-5acb710a815b',
                                catetory: 'daily',
                                context: '{"dt": "2020-10-05"}',
                                created_time: '2020-10-18 23:24:28',
                                finished: false,
                                name: 'test-daily',
                                pis: [
                                    {
                                        id: '6941d659-ddb5-4828-9b09-2a77eaef323c',
                                        context: "{\"dag_run\": {\"execution_date\": \"2020-10-18T23:26:10+00:00\", \"message\": \"Created <DagRun import-trading-data @ 2020-10-18 23:26:10+00:00: manual__2020-10-18T23:26:10+00:00, externally triggered: True>\", \"run_id\": \"manual__2020-10-18T23:26:10+00:00\"}}",
                                        created_time: '2020-10-18 23:24:35',
                                        failed_time: null,
                                        finished_time: null,
                                        started_time: null,
                                        status: 'finished',
                                        group: 'eeea8045-11b3-460c-b21e-5acb710a815b',
                                        pipeline: {
                                            id: '7bbafbcd-725e-4208-93b6-df7efc75df9f',
                                            author: 'stonezhong',
                                            category: 'daily',
                                            context: "{\"type\":\"sequential\",\"dag_id\":\"\",\"requiredDSIs\":[],\"tasks\":[{\"name\":\"import-trading-data\",\"description\":\"\",\"type\":\"other\",\"args\":\"{}\",\"steps\":[],\"application_id\":\"1e871b84-5ee8-45e3-bd29-a62b52bdfe56\"}]}",
                                            version: 1,
                                            dag_version: 1,
                                            name: 'import-trading-data',
                                            paused: false,
                                            retired: false,
                                            team: 'trading',
                                            description: '',
                                        }
                                    }
                                ]
                            }
                        );
                    }}
                >
                    Edit Pipeline Group
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testPipelineGroupEditorRef.current.openDialog("new")
                    }}
                >
                    New Pipeline Group
                </Button>
            </div>
        );
    }
}
