Imports System.IO
Imports System.Text
Imports System.Text.RegularExpressions

Module Module1

    Class Uglyfy
        Public ReadOnly Property inputWriter As StreamWriter
        Private Process As Process
        Sub New()
            Dim ProcessStartInfo = New ProcessStartInfo("cmd", "/c uglifyjs -c -m")
            ProcessStartInfo.UseShellExecute = False
            ProcessStartInfo.ErrorDialog = False
            Process = New Process()
            Process.StartInfo = ProcessStartInfo
            ProcessStartInfo.RedirectStandardInput = True
            ProcessStartInfo.RedirectStandardOutput = True
            'ProcessStartInfo.RedirectStandardError = True
            Dim processStarted = Process.Start()
            inputWriter = Process.StandardInput
        End Sub

        Function Terminate()
            Process.Kill()
        End Function

        Function Done() As String
            Dim outputReader = Process.StandardOutput
            inputWriter.Close()
            Dim retValue = outputReader.ReadToEnd()
            Process.WaitForExit()
            Return retValue
        End Function
    End Class

    Class MyStreamWriter
        Private streams As New List(Of StreamWriter)
        Sub AddStream(sw As StreamWriter)
            streams.Add(sw)
        End Sub

        Sub Write(text As String)
            For Each s In streams
                s.Write(text)
            Next
        End Sub

        Sub WriteLine(text As String)
            For Each s In streams
                s.WriteLine(text)
            Next
        End Sub

        Sub Close()
            For Each s In streams
                s.Close()
            Next
        End Sub
    End Class

    Function CheckJS(ByRef script As String) As String
        Dim workerEx = New Regex("Worker\(""(\w*\.js)""\)", RegexOptions.Singleline)
        Dim allWorker = workerEx.Matches(script)
        For i As Integer = allWorker.Count - 1 To 0 Step -1
            Dim m = allWorker(i)
            Dim output = compressJS(m.Groups(1).Value)
            script = script.Remove(m.Index, m.Length)
            script = script.Insert(m.Index, "Worker(""" & output & """)")
        Next

        Dim shadersEx = New Regex("""(\w*\.[vf]s)""", RegexOptions.Singleline)
        Dim allShader = shadersEx.Matches(script)
        For i As Integer = allShader.Count - 1 To 0 Step -1
            Dim m = allShader(i)
            Dim output = compressShader(m.Groups(1).Value)
            script = script.Remove(m.Index, m.Length)
            script = script.Insert(m.Index, "(""" & output & """)")
        Next

        Return script
    End Function

    Function compressHTML(inputfilename As String) As String
        Console.WriteLine("Compiling " & inputfilename & "...")
        Dim inputWriter As New MyStreamWriter
        If Array.IndexOf(Environment.GetCommandLineArgs(), "-d") <> -1 Then
            inputWriter.AddStream(New StreamWriter(inputfilename & ".all.js"))
        End If
        Dim outputFilename = Path.GetFileNameWithoutExtension(inputfilename) & ".min" &
                          Path.GetExtension(inputfilename)
        Dim outputDate = #01/01/1900#
        If File.Exists(outputFilename) Then
            outputDate = FileIO.FileSystem.GetFileInfo(outputFilename).LastWriteTime
        End If
        Dim inputDate = FileIO.FileSystem.GetFileInfo(inputfilename).LastWriteTime
        Dim needCompile = inputDate > outputDate
        Dim code = File.ReadAllText(inputfilename)
        Dim myJSRegEx = New Regex("<script.*?(src=""(\w*\.js)"")?>(.*?)</script>", RegexOptions.Singleline)
        Dim alljs = myJSRegEx.Matches(code)
        Dim uglify As New Uglyfy
        inputWriter.AddStream(uglify.inputWriter)
        For Each m As Match In alljs
            Dim thisJs = m.Groups(2).Value
            If Not String.IsNullOrEmpty(thisJs) Then
                inputDate = FileIO.FileSystem.GetFileInfo(thisJs).LastWriteTime
                needCompile = needCompile OrElse inputDate > outputDate
                inputWriter.WriteLine("/* ***********" + thisJs + "*********** */")
                inputWriter.Write(CheckJS(File.ReadAllText(thisJs)))
                inputWriter.WriteLine("/* *********** ************ *********** */")
            End If
            thisJs = m.Groups(3).Value
            If Not String.IsNullOrEmpty(thisJs) Then
                inputWriter.WriteLine("/* *********** index.html(" + m.Groups(3).Index.ToString() + ") *********** */")
                inputWriter.WriteLine(CheckJS(thisJs))
                inputWriter.WriteLine("/* *********** ************ *********** */")
            End If
        Next
        If needCompile Then
            code = myJSRegEx.Replace(code, "")
            Dim toAdd = "<script type=""text/javascript"">" + vbCrLf
            toAdd += uglify.Done()
            inputWriter.Close()
            toAdd += "</script>" + vbCrLf
            code = code.Insert(alljs(0).Index, toAdd)
            File.WriteAllText(outputFilename, code)
            Console.WriteLine("Done in " & outputFilename)
        Else
            Console.WriteLine("Skipped")
            uglify.Terminate()
        End If
        Return outputFilename
    End Function

    Function compressJS(inputFilename As String) As String
        Console.WriteLine("Compiling " & inputFilename & "...")
        Dim outputFilename = Path.GetFileNameWithoutExtension(inputFilename) & ".min" &
                          Path.GetExtension(inputFilename)
        Dim outputDate = #01/01/1900#
        If File.Exists(outputFilename) Then
            outputDate = FileIO.FileSystem.GetFileInfo(outputFilename).LastWriteTime
        End If
        Dim inputDate = FileIO.FileSystem.GetFileInfo(inputFilename).LastWriteTime
        If inputDate > outputDate Then
            Dim uglify As New Uglyfy
            uglify.inputWriter.Write(File.ReadAllText(inputFilename))
            File.WriteAllText(outputFilename, uglify.Done())
            Console.WriteLine("Done in " & outputFilename)
        Else
            Console.WriteLine("Skipped")
        End If
        Return outputFilename
    End Function

    Function compressShader(inputFilename As String) As String
        Console.WriteLine("Compiling " & inputFilename & "...")
        Dim outputFilename = Path.GetFileNameWithoutExtension(inputFilename) & ".min" &
                          Path.GetExtension(inputFilename)
        Dim outputDate = #01/01/1900#
        If File.Exists(outputFilename) Then
            outputDate = FileIO.FileSystem.GetFileInfo(outputFilename).LastWriteTime
        End If
        Dim inputDate = FileIO.FileSystem.GetFileInfo(inputFilename).LastWriteTime
        If inputDate > outputDate Then
            Dim cmd = "/c glslmin " & inputFilename & " -o " & outputFilename
            Dim ProcessStartInfo = New ProcessStartInfo("cmd", cmd)
            ProcessStartInfo.UseShellExecute = False
            ProcessStartInfo.ErrorDialog = False
            Dim Process = New Process()
            Process.StartInfo = ProcessStartInfo
            Process.Start()
            Process.WaitForExit()
            Console.WriteLine("Done in " & outputFilename)
        Else
            Console.WriteLine("Skipped")
        End If
        Return outputFilename
    End Function

    Sub Main()
        Dim fileName As String = Nothing
        Try
            fileName = Environment.GetCommandLineArgs()(1)
            If fileName(0) = "-"c Then
                fileName = Nothing
            End If
        Catch ex As Exception

        End Try
        If fileName Is Nothing Then
            fileName = "index.html"
        End If

        Dim ext = Path.GetExtension(fileName)
        Select Case ext
            Case ".html"
                compressHTML(fileName)
            Case ".js"
                compressJS(fileName)
            Case ".vs", ".fs", ".gs", ".vert", ".frag", ".geom"
                compressShader(fileName)
        End Select
    End Sub

End Module
