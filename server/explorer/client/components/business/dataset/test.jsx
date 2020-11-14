import React from 'react'

import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'

import {DatasetEditor} from './dataset_editor.jsx'

export class TestDatasetEditor extends React.Component {
    testDatasetEditorRef = React.createRef();

    onSaveDataset = (mode, dataset) => {
        console.log(`Test Dataset is saved as ${mode}`);
        console.log(dataset);
    };

    onCancelDataset = () => {
        console.log("Test Dataset is not saved");
    };

    render() {
        return (
            <Container fluid>
                <h2>Test DatasetEditor</h2>
                <DatasetEditor
                    ref={this.testDatasetEditorRef}
                    onSave={this.onSaveDataset}
                    onCancel={this.onCancelDataset}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testDatasetEditorRef.current.openDialog("new");
                    }}
                >
                    New Dataset
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testDatasetEditorRef.current.openDialog("edit", {
                            name: "test data",
                            major_version: "2.1",
                            minor_version: 2,
                            description: "Blah...",
                            team: "trading",
                            expiration_time: null,
                        });
                    }}
                >
                    Edit Dataset
                </Button>
            </Container>
        );
    }
}
